import {Version} from './Version';

export class Project {
    name : string;
    version : Version;
    constructor(projectFullName : string) {
        this.name = projectFullName.split("/")[0];
        this.version = new Version(projectFullName.split("/")[1]);
    }
    getFullName() : string {
        return `${this.name}/${this.version.getString()}`;
    };
}