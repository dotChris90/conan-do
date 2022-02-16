export class Version {
    public major : number;
    public minor : number;
    public patch : number;
    constructor(versionString : string) {
        let versionArray = versionString.split(".");
        this.major = parseInt(versionArray[0]);
        this.minor = parseInt(versionArray[1]);
        this.patch = parseInt(versionArray[2]);
    }
    getString() : string {
        return `${this.major}.${this.minor}.${this.patch}`;
    }
}