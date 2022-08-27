import {ResultsPaneViewSettings} from "./results-view-settings";
import {IEventBus, ISession, ScriptEnvironment, ScriptOutputEmittedEvent, ScriptStatus, Settings} from "@domain";
import {bindable, IDisposable, ILogger} from "aurelia";
import {watch} from "@aurelia/runtime-html";
import {ViewModelBase} from "@application";

export class ResultsView extends ViewModelBase {
    public resultsViewSettings: ResultsPaneViewSettings;
    @bindable public environment: ScriptEnvironment;
    @bindable public onCloseRequested: () => void;

    private resultsEl: HTMLElement;
    private resultControls: ResultControls;
    private prevSearch: { search: string, elements: Array<Element>, selectedInd: number } = {
        search: '',
        elements: [],
        selectedInd: 0
    };

    public displayFindInPage = false;

    constructor(private readonly settings: Settings,
                @ISession private readonly session: ISession,
                @IEventBus readonly eventBus: IEventBus,
                @ILogger logger: ILogger
    ) {
        super(logger);
        this.resultsViewSettings = new ResultsPaneViewSettings(this.settings.results.textWrap);
    }

    public attached() {
        this.resultControls = new ResultControls(this.resultsEl);

        const token = this.eventBus.subscribeToServer(ScriptOutputEmittedEvent, msg => {
            if (msg.scriptId === this.environment.script.id) {
                this.appendResults(msg.output);
            }
        });
        this.disposables.push(() => token.dispose());

        document.addEventListener("keyup", this.handleKeyUp)
    }

    public override detaching() {
        this.resultControls.dispose();
        document.removeEventListener("keyup", this.handleKeyUp);
        super.detaching();
    }

    private appendResults(results: string | null) {
        if (!results) return;

        const template = document.createElement("template");
        template.innerHTML = results;
        this.resultControls.bind(template.content);
        this.resultsEl.appendChild(template.content);
    }

    private clearResults()
    {
        this.resultControls.dispose();
        while (this.resultsEl.firstChild)
            this.resultsEl.removeChild(this.resultsEl.lastChild);
    }

    private handleKeyUp = (e) => {
        if (e.ctrlKey && e.key === 'f') {
            this.openFindInPage()
        }
    }

    @watch<ResultsView>(vm => vm.environment.status)
    private scriptStatusChanged(newStatus: ScriptStatus, oldStatus: ScriptStatus) {
        if (oldStatus !== "Running" && newStatus === "Running")
            this.clearResults();
    }

    public openFindInPage(){
        this.displayFindInPage = true;
    }

    public findInPage(event) {
        const search = event.target.value;
        for (let element of this.prevSearch.elements) {
            element.innerHTML = element.textContent.replaceAll(`<mark>${this.prevSearch.search}</mark>`, `${this.prevSearch.search}`);
        }

        this.prevSearch = {
            search: '',
            elements: [],
            selectedInd: 0
        };

        if (!search)
            return;

        this.prevSearch.search = search;
        const searchableElements = Array.from(this.resultsEl.querySelectorAll(".searchable"));
        let ind = 0;
        for (const ele of searchableElements) {
            if (ele.textContent.indexOf(search) === -1)
                continue;

            ele.innerHTML = ele.textContent.replaceAll(search, `<mark class="${ind === this.prevSearch.selectedInd ? 'selected' : ''}">${search}</mark>`);
            this.prevSearch.elements.push(ele);
            ind++;
        }
    }

    public closeAndClearFind() {
        for (let element of this.prevSearch.elements) {
            if (element === this.prevSearch.elements[this.prevSearch.selectedInd]) {
                element.innerHTML = element.textContent.replaceAll(`<mark class="selected">${this.prevSearch.search}</mark>`, this.prevSearch.search);
            } else {
                element.innerHTML = element.textContent.replaceAll(`<mark>${this.prevSearch.search}</mark>`, this.prevSearch.search);
            }
        }

        this.displayFindInPage = false;
        this.prevSearch = {
            search: '',
            elements: [],
            selectedInd: 0
        };
    }

    public selectFoundInPage(ind: number) {
        ind = this.reArrangeInd(ind);

        this.prevSearch.elements[this.prevSearch.selectedInd].firstElementChild.classList.toggle("selected");
        this.prevSearch.elements[ind].firstElementChild.classList.toggle("selected");
        this.prevSearch.elements[ind].scrollIntoView({block: "center", inline: "center", behavior: "smooth"});
        this.prevSearch.selectedInd = ind;
    }

    public reArrangeInd(ind) {
        if (ind >= this.prevSearch.elements.length)
            return 0
        else if (ind < 0)
            return this.prevSearch.elements.length - 1;

        return ind;
    }
}

class ResultControls implements IDisposable {
    private disposables: (() => void)[] = [];

    constructor(private readonly resultsElement: HTMLElement) {
    }

    public bind(content: DocumentFragment) {

        for (const table of Array.from(content.querySelectorAll("table"))) {

            let collapseTarget = table.querySelector(":scope > thead > tr > th.table-item-count");
            if (!collapseTarget)
                collapseTarget = table.querySelector(":scope > thead > tr > th");

            collapseTarget.classList.add("collapse-actionable");
            const clickHandler = () => this.toggle(table);
            collapseTarget.addEventListener("click", clickHandler);
            this.disposables.push(() => collapseTarget.removeEventListener("click", clickHandler));

            const caret = document.createElement("i");
            collapseTarget.prepend(caret);
            caret.classList.add("caret-down-icon", "icon-lg", "me-2");
        }
    }

    public expand(element: Element) {
        element.classList.remove("collapsed");
    }

    public collapse(element: Element) {
        element.classList.add("collapsed");
    }

    public toggle(element: Element) {
        if (element.classList.contains("collapsed"))
            this.expand(element);
        else
            this.collapse(element);
    }

    private expandAllTables() {
        this.querySelectorAll("table").forEach(t => this.expand(t));
    }

    private collapseAllTables() {
        this.querySelectorAll("table").forEach(t => this.collapse(t));
    }

    querySelectorAll(selectors: string) {
        return Array.from(this.resultsElement.querySelectorAll(selectors))
    }

    public dispose(): void {
        this.disposables.forEach(d => d());
    }
}
