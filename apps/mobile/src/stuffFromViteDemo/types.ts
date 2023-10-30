// "derived" from InspectionEvent but too lazy to TypeScript this
// preoprly atm
export type SlimSnapshot = {
  type: string;
  context: any;

  previous?: {
    event?: SlimSnapshot;
    context?: any;
  };
  next?: {
    event?: SlimSnapshot;
    context?: any;
  };
};
