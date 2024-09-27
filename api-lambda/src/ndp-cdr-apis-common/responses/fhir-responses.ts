import {OperationOutcome} from "fhir/r4";

type OperationOutcomeSeverity = 'fatal' | 'error' | 'warning' | 'information';

export class OperationOutcomeResponse {
  severity: OperationOutcomeSeverity;
  code: string;
  message: string;

  constructor(severity: OperationOutcomeSeverity, code: string, message: string) {
    this.severity = severity;
    this.code = code;
    this.message = message;
  }


  getOperationOutcome(): OperationOutcome {
    return {
      resourceType: "OperationOutcome",
      text: {
        status: "generated",
        div: `<div xmlns="http://www.w3.org/1999/xhtml">
        <h1>Operation Outcome</h1>
        <table border="0">
        <tr>
        <td style="font-weight: bold;">${this.severity.toUpperCase()}</td>
        <td>[]</td>
        <td><pre>${this.message}</pre></td>
        </tr>
        </table>
        </div>`,
      },
      issue: [
        {
          severity: this.severity,
          code: this.code,
          diagnostics: this.message,
        },
      ],
    };
  }
}

