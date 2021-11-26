import {IScriptManager, ISession, Script} from "@domain";

export class Index {
    public script: Script;
    public namespaces: string;

    constructor(
        readonly startupOptions: URLSearchParams,
        @ISession readonly session: ISession,
        @IScriptManager readonly scriptManager: IScriptManager) {
    }

    public async binding() {
        const environment = await this.session.getEnvironment(this.startupOptions.get("script-id"));
        this.script = environment.script;

        document.title = `${this.script.name} - Properties`;
        let namespaces = this.script.config.namespaces.join("\n");
        if (namespaces)
            namespaces += "\n";
        this.namespaces = namespaces;
    }

    public async ok() {
        try {
            const config = this.script.config;
            config.namespaces = this.namespaces
                .split('\n')
                .map(ns => ns.trim())
                .filter(ns => ns);

            await this.scriptManager.setScriptNamespaces(this.script.id, config.namespaces);
            window.close();
        }
        catch (ex) {
            alert(ex);
        }
    }

    public cancel() {
        window.close();
    }
}