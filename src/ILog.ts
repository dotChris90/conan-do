export interface ILog {
    writeOut(text: string, withDate: boolean): void;
    writeErr(text: string): void;
}