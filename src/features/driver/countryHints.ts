/**
 * Example values ("faded hints") for the driver application, per country, so a US driver sees US-style
 * examples and a Kenyan driver Kenyan ones. Unknown countries get neutral examples.
 */
export type DriverHints = {
  idLabel: string; idExample: string;
  licenceLabel: string; licenceExample: string;
  plateExample: string; bikePlateExample: string;
  carMake: string; carModel: string; bikeMake: string; bikeModel: string; year: string; colour: string;
};

const HINTS: Record<string, DriverHints> = {
  ke: {
    idLabel: 'National ID number', idExample: 'e.g. 12345678',
    licenceLabel: 'Driving licence number', licenceExample: 'As on your NTSA licence',
    plateExample: 'e.g. KDA 123A', bikePlateExample: 'e.g. KMGA 123B',
    carMake: 'Toyota', carModel: 'Axio', bikeMake: 'Bajaj', bikeModel: 'Boxer', year: '2016', colour: 'Silver',
  },
  us: {
    idLabel: 'State ID or passport number', idExample: 'e.g. 1234-56-7890',
    licenceLabel: "Driver's license number", licenceExample: 'e.g. 1234-56-7890 (Indiana)',
    plateExample: 'e.g. ABC123', bikePlateExample: 'e.g. ABC123',
    carMake: 'Toyota', carModel: 'Camry', bikeMake: 'Honda', bikeModel: 'CB500', year: '2018', colour: 'Silver',
  },
};

const NEUTRAL: DriverHints = {
  idLabel: 'ID number (national ID, passport or state ID)', idExample: '',
  licenceLabel: 'Driving licence number', licenceExample: '',
  plateExample: '', bikePlateExample: '',
  carMake: 'Toyota', carModel: 'Corolla', bikeMake: 'Honda', bikeModel: '', year: '2018', colour: 'Silver',
};

export function driverHints(country: string | null | undefined): DriverHints {
  return (country && HINTS[country]) || NEUTRAL;
}
