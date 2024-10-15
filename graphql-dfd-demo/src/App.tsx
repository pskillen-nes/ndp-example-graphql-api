import React, {ReactNode, useState} from "react"; // Import Bootstrap CSS
import {Alert, Badge, Button, Container, Form, InputGroup, Tab, Tabs} from 'react-bootstrap';
import {useLocalStorage} from 'usehooks-ts';
import {ApolloError, gql, useQuery} from '@apollo/client';
import {Immunization, Patient} from "fhir/r4";
import {CodeableConcept, Encounter as EncounterR5, EncounterReason, Organization} from "fhir/r5";

import './App.css'
import {MedicalDevice} from "./types.ts";

// GraphQL query to get patient demographics by CHI number
const FETCH_ALL_QUERY = gql`
  query FetchAllData($chiNumber: String!) {
    getPatientByCHI(chiNumber: $chiNumber) {
      id
      name {
        family
        given
      }
      birthDate
      gender
      managingOrganization {
        identifier {
          system
          value
        }
        display
      }
      address {
        city
        line
        postalCode
        text
        use
      }
      deceased
      generalPractitioner {
        identifier {
          system
          value
        }
      }
    }

    getMedicalDevicesByChi(chiNumber: $chiNumber) {
      deviceSerialNum
      productDescription
      lotOrBatchNum
      mddClass
      procedure {
        code
        description
      }
      operation {
        identifier
        dateTime
      }
    }

    getDermatologyEncountersByChi(chiNumber: $chiNumber) {
      id
      status
      type {
        text
        coding {
          code
          display
        }
      }
      actualPeriod {
        start
        end
      }
      reason {
        concept {
          text
        }
      }
      participant {
        actor {
          reference
        }
      }
      serviceProvider {
        id
        name
      }
    }

    getImmunizationsByChi(chiNumber: $chiNumber) {
      id
      status
      vaccineCode {
        coding {
          code
          display
        }
      }
      occurrenceDateTime
      recorded
      lotNumber
      site {
        coding {
          display
        }
      }
      route {
        coding {
          display
        }
      }
      performer {
        actor {
          reference
        }
      }
    }
  }
`;

function PatientDemographicsDisplay(props: { patient?: Patient }) {
  if (!props.patient)
    return <>
      <h1>Patient Demographics</h1>
      <Alert variant='warning' title="Not found">
        <p><strong>Not found</strong></p>
        <p>Patient not found within NDP Demographics Service</p>
        <p>There may still be information on other tabs</p>
      </Alert>
    </>


  const {name, birthDate, gender, address, generalPractitioner} = props.patient;

  return <>
    <h1>Patient Demographics</h1>
    {name && name.map((hn, n) => {
      return <p key={`name-${n}`}>
        <strong>Name:</strong>{hn.prefix} {hn.family}, {hn.given?.join(' ')} {hn.suffix}{hn.use && ` (${hn.use})`}
      </p>
    })}
    <p><strong>Birth Date:</strong> {birthDate}</p>
    <p><strong>Gender:</strong> {gender}</p>

    <h2>Address</h2>
    {address?.map((addr, n) => {
        const parts = [addr.line, addr.city, addr.postalCode, addr.country]
          .flat()
          .filter(p => p != null && p.length > 0);
        return <p key={`addr-${n}`}>{parts.join(', ')}</p>
      }
    )}

    <h2>General Practitioner</h2>
    {(generalPractitioner && generalPractitioner.length > 0)
      ? generalPractitioner.map((gp, n) => <p key={`gp-${n}`}>{gp.identifier?.value}</p>)
      : <p>No GP assigned</p>}
  </>;
}

function MedicalDevicesDisplay(props: { medicalDevices?: MedicalDevice[] }) {
  const {medicalDevices} = props;

  if (!medicalDevices || medicalDevices.length === 0) {
    return <>
      <Alert variant='warning' title="Not found">
        <p><strong>Not found</strong></p>
        <p>No medical devices found for this patient within the MDDH database</p>
      </Alert>
    </>;
  }

  return (
    <div>
      <h2>Medical Devices</h2>
      <ul className="list-group">
        {medicalDevices.map((device, index) => (
          <li key={index} className="list-group-item">
            <h5>Device {index + 1}</h5>
            <p><strong>Serial Number:</strong> {device.deviceSerialNum}</p>
            <p><strong>Description:</strong> {device.productDescription}</p>
            <p><strong>Lot/Batch Number:</strong> {device.lotOrBatchNum}</p>
            <p><strong>MDD Class:</strong> {device.mddClass}</p>
            <h6>Procedure</h6>
            <p><strong>Code:</strong> {device.procedure.code}</p>
            <p><strong>Description:</strong> {device.procedure.description}</p>
            <h6>Operation</h6>
            <p><strong>Identifier:</strong> {device.operation.identifier}</p>
            <p><strong>Date:</strong> {new Date(device.operation.dateTime).toLocaleString()}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}

function DermatologyDisplay(props: { encounters?: EncounterR5[] }) {
  const {encounters} = props;

  if (!encounters || encounters.length === 0) {
    return <>
      <Alert variant='warning' title="Not found">
        <p><strong>Not found</strong></p>
        <p>No dermatology encounters found for this patient within the Digital Dermatology database</p>
      </Alert>
    </>;
  }

  return (
    <div>
      <h2>Dermatology Encounters</h2>
      <ul className="list-group">
        {encounters.map((encounter, index) => {
          const provider = encounter.serviceProvider as Organization

          return (
            <li key={index} className="list-group-item">
              <h5>Encounter {index + 1}</h5>
              <p><strong>Status:</strong> {encounter.status}</p>
              {encounter.actualPeriod && <>
                <p><strong>Start
                  Date:</strong> {encounter.actualPeriod?.start ? new Date(encounter.actualPeriod.start).toLocaleString() : 'Unknown start'}
                </p>
                <p><strong>End
                  Date:</strong> {encounter.actualPeriod?.end ? new Date(encounter.actualPeriod.end).toLocaleString() : 'Ongoing'}
                </p></>}

              <h6>Reason:</h6>
              {encounter.reason?.map((r: EncounterReason, i: number) => {
                const reason = r as { concept: CodeableConcept };
                return (
                  <p key={i}><strong>Reason {i + 1}:</strong> {reason.concept.text}</p>
                );
              })}

              <h6>Service Provider:</h6>
              {provider
                ? <p><strong>Provider Name:</strong> {provider.name}</p>
                : <p>Unknown</p>}

              <h6>Participants:</h6>
              {encounter.participant?.map((p, i) => (
                <p key={i}><strong>Participant {i + 1}:</strong> {p.actor?.reference}</p>
              ))}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function ImmunizationsDisplay(props: { immunizations?: Immunization[] }) {
  const {immunizations} = props;

  if (!immunizations || immunizations.length === 0) {
    return <>
      <Alert variant='warning' title="Not found">
        <p><strong>Not found</strong></p>
        <p>No immunizations found for this patient within the NCDS database</p>
      </Alert>
    </>;
  }

  return (
    <div>
      <h2>Immunizations</h2>
      <ul className="list-group">
        {immunizations.map((immunization, index) => (
          <li key={index} className="list-group-item">
            <h5>Immunization {index + 1}</h5>
            <p><strong>Status:</strong> {immunization.status}</p>
            <p><strong>Vaccine:</strong> {immunization.vaccineCode.coding![0].display}</p>
            <p><strong>Occurrence
              Date:</strong> {immunization.occurrenceDateTime && new Date(immunization.occurrenceDateTime).toLocaleString()}
            </p>
            <p><strong>Recorded
              Date:</strong> {immunization.recorded && new Date(immunization.recorded).toLocaleString()}</p>
            <p><strong>Lot Number:</strong> {immunization.lotNumber}</p>
            <p><strong>Site:</strong> {immunization.site?.coding![0].display}</p>
            <p><strong>Route:</strong> {immunization.route?.coding![0].display}</p>

            <h6>Performer(s):</h6>
            {immunization.performer?.map((p, i) => (
              <p key={i}><strong>Performer {i + 1}:</strong> {p.actor.reference}</p>
            ))}
          </li>
        ))}
      </ul>
    </div>
  );
}

function DataAvailablePill(props: { data?: object, children: ReactNode }) {
  const notFound = props.data == null;
  const recordsAvailable = props.data && (!Array.isArray(props.data) || props.data.length > 0);

  const color = notFound
    ? 'danger'
    : !recordsAvailable
      ? 'warning'
      : 'success';

  return <Badge pill bg={color} className="m-1">
    {props.children}
  </Badge>;
}

function ErrorHandler(props: { error: ApolloError, children: ReactNode }) {
  const {error} = props;

  return (
    <>
      <Alert variant="danger" style={{textAlign: 'left'}}>
        {error.graphQLErrors && error.graphQLErrors.length > 0 && (
          <div>
            <h5>GraphQL Errors</h5>
            {error.graphQLErrors.map((graphQLError, index) => (
              <React.Fragment key={index}>
                <div><strong>Message:</strong> {graphQLError.message}</div>
                {graphQLError.locations && <div>(
                  <span>
                    <strong>Locations:</strong>{' '}
                    {graphQLError.locations.map(
                      (location) => `Line ${location.line}, Column ${location.column}`
                    ).join(', ')}
                      </span>
                  )</div>}
                {graphQLError.path && <div>(
                  <span>
                    <strong>Path:</strong> {graphQLError.path.join(' > ')}
                      </span>
                  )</div>}
                <strong>Extensions:</strong> {JSON.stringify(graphQLError.extensions)}
              </React.Fragment>
            ))}
          </div>
        )}

        {error.protocolErrors && error.protocolErrors.length > 0 && (
          <div>
            <h5>Protocol Errors</h5>
            <ul>
              {error.protocolErrors.map((protocolError, index) => (
                <li key={index}>
                  <strong>Message:</strong> {protocolError.message}
                  <strong>Details:</strong> {JSON.stringify(protocolError)}
                </li>
              ))}
            </ul>
          </div>
        )}

        {error.clientErrors && error.clientErrors.length > 0 && (
          <div>
            <h5>Client Errors</h5>
            <ul>
              {error.clientErrors.map((clientError, index) => (
                <li key={index}>
                  <strong>Message:</strong> {clientError.message}
                  <strong>Details:</strong> {JSON.stringify(clientError)}
                </li>
              ))}
            </ul>
          </div>
        )}

        {error.networkError && (
          <div>
            <h5>Network Error</h5>
            <p>
              <strong>Message:</strong> {error.networkError.message}
            </p>
            {error.networkError.name && (
              <p>
                <strong>Error Name:</strong> {error.networkError.name}
              </p>
            )}
            {error.networkError.stack && (
              <p>
                <strong>Stack Trace:</strong> {error.networkError.stack}
              </p>
            )}
          </div>
        )}

        {!error.graphQLErrors &&
          !error.protocolErrors &&
          !error.clientErrors &&
          !error.networkError && (
            <p style={{textAlign: 'left'}}>
              <strong>Unknown Error:</strong> {error.message}
            </p>
          )}

        {props.children}
      </Alert>
    </>
  );
}


function App() {

  const handyPatients = ['6663332221', '0123456789', '1212670841'];

  const [tabKey, setTabKey] = useState<string>('tabDemographics');

  const [chiNumber, setChiNumber] = useLocalStorage<string>('SELECTED_CHI', '');
  const [inputChiNumber, setInputChiNumber] = useState<string>(chiNumber);
  const [showErrors, setShowErrors] = useState<boolean>(false);

  const handleSearch = () => {
    // You can handle the search logic here, e.g., make a GraphQL query using the chiNumber
    setChiNumber(inputChiNumber);
    console.log('Searching for CHI:', chiNumber);
  };

  // Execute the query and get the data, loading state, and error state
  const {loading, error, data} = useQuery<{
    getPatientByCHI: Patient,
    getMedicalDevicesByChi: MedicalDevice[],
    getDermatologyEncountersByChi: EncounterR5[],
    getImmunizationsByChi: Immunization[],
  }>(FETCH_ALL_QUERY, {
    errorPolicy: "all",
    variables: {chiNumber}
  });

  function PatientInfoTabContainer(props: {
    patient: Patient,
    medicalDevices?: MedicalDevice[],
    dermatologyEncounters?: EncounterR5[],
    immunizations: Immunization[],
  }): React.JSX.Element {
    const {patient, medicalDevices, dermatologyEncounters, immunizations} = props;

    return <Tabs
      id="controlled-tab"
      activeKey={tabKey}
      onSelect={(k) => setTabKey(k || 'tabDemographics')}
      className="mb-3"
    >
      <Tab eventKey="tabDemographics" title="Demographics">
        <div className="p-3">
          <PatientDemographicsDisplay patient={patient}/>
        </div>
      </Tab>
      <Tab eventKey="tabMedicalDevices" title="Medical Devices">
        <div className="p-3">
          <MedicalDevicesDisplay medicalDevices={medicalDevices}/>
        </div>
      </Tab>
      <Tab eventKey="tabDermatology" title="Dermatology">
        <div className="p-3">
          <DermatologyDisplay encounters={dermatologyEncounters}/>
        </div>
      </Tab>
      <Tab eventKey="tabImmunizations" title="Immunizations">
        <div className="p-3">
          <ImmunizationsDisplay immunizations={immunizations}/>
        </div>
      </Tab>
    </Tabs>
  }

  return (
    <Container className="mt-4">
      <h1>Search Patient by CHI</h1>
      <Form className="mb-3">
        <InputGroup>
          <InputGroup.Text>CHI</InputGroup.Text>
          <Form.Control
            type="text"
            placeholder="Enter CHI number"
            value={inputChiNumber}
            onChange={(e) => setInputChiNumber(e.target.value)}
          />
          <Button variant="primary" onClick={handleSearch}>
            Search
          </Button>
        </InputGroup>

        <p>Handy patients:
          {handyPatients.map((chi, n) => <a
            href="#"
            key={`handy-${n}`}
            className="m-1"
            onClick={() => {
              setChiNumber(chi);
              setInputChiNumber(chi)
            }}
          >{chi}</a>)}
        </p>
      </Form>

      <hr/>

      {loading && <p>Loading...</p>}
      {!loading && !error && !data && <p>No data found!</p>}

      {data && <>
        <div className="mb-3">
          <DataAvailablePill data={data.getPatientByCHI}>Demographics</DataAvailablePill>
          <DataAvailablePill data={data.getMedicalDevicesByChi}>MDDH</DataAvailablePill>
          <DataAvailablePill data={data.getDermatologyEncountersByChi}>Dermatology</DataAvailablePill>
          <DataAvailablePill data={data.getImmunizationsByChi}>Vaccinations</DataAvailablePill>
        </div>
        <PatientInfoTabContainer patient={data.getPatientByCHI}
                                 medicalDevices={data.getMedicalDevicesByChi}
                                 dermatologyEncounters={data.getDermatologyEncountersByChi}
                                 immunizations={data.getImmunizationsByChi}
        />
      </>}

      {error && <>
        {showErrors || <a href="#" onClick={() => setShowErrors(true)}>Show errors</a>}
        {showErrors && <ErrorHandler error={error}>
          <a href="#" onClick={() => setShowErrors(false)}>Hide errors</a>
        </ErrorHandler>}
      </>}
    </Container>
  );
}

export default App
