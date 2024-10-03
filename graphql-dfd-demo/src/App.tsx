import React, {useState} from "react"; // Import Bootstrap CSS
import {Alert, Button, Container, Form, InputGroup, Tab, Tabs} from 'react-bootstrap';
import {useLocalStorage} from 'usehooks-ts';
import {gql, useQuery} from '@apollo/client';
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
    {name && name.map(n => {
      return <p>
        <strong>Name:</strong>{n.prefix} {n.family}, {n.given?.join(' ')} {n.suffix}{n.use && ` (${n.use})`}
      </p>
    })}
    <p><strong>Birth Date:</strong> {birthDate}</p>
    <p><strong>Gender:</strong> {gender}</p>

    <h2>Address</h2>
    {address?.map(addr => {
        const parts = [addr.line, addr.city, addr.postalCode, addr.country]
          .flat()
          .filter(p => p != null && p.length > 0);
        return <p>{parts.join(', ')}</p>
      }
    )}

    <h2>General Practitioner</h2>
    {(generalPractitioner && generalPractitioner.length > 0)
      ? generalPractitioner.map(gp => <p>{gp.identifier?.value}</p>)
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
            <p><strong>Occurrence Date:</strong> {immunization.occurrenceDateTime && new Date(immunization.occurrenceDateTime).toLocaleString()}</p>
            <p><strong>Recorded Date:</strong> {immunization.recorded && new Date(immunization.recorded).toLocaleString()}</p>
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

function App() {

  const [tabKey, setTabKey] = useState<string>('tabDemographics');

  const [chiNumber, setChiNumber] = useLocalStorage<string>('SELECTED_CHI', '');
  const [inputChiNumber, setInputChiNumber] = useState<string>(chiNumber);

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
      </Form>

      {loading && <p>Loading...</p>}
      {error && <p>Error: {error.message}</p>}
      {!loading && !error && !data && <p>No data found!</p>}

      {data && <PatientInfoTabContainer patient={data.getPatientByCHI}
                                        medicalDevices={data.getMedicalDevicesByChi}
                                        dermatologyEncounters={data.getDermatologyEncountersByChi}
                                        immunizations={data.getImmunizationsByChi}
      />}
    </Container>
  );
}

export default App
