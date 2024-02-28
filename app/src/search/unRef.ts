import {Constants} from "../constants";
import {fetchPost} from "../util/fetch";
import {setStorageVal, updateHotkeyTip} from "../protyle/util/compatibility";
import {getArticle, getAttr} from "./util";
import {MenuItem} from "../menus/Menu";
import {isPaidUser} from "../util/needSubscribe";
import {showMessage} from "../dialog/message";
import {escapeAriaLabel, escapeGreat} from "../util/escape";
import {getIconByType} from "../editor/getIcon";
import {unicode2Emoji} from "../emoji";
import {getDisplayName, getNotebookName} from "../util/pathName";
import {Protyle} from "../protyle";
import {App} from "../index";
import {resize} from "../protyle/util/resize";
import {Menu} from "../plugin/Menu";

export const openSearchUnRef = (app: App, element: Element, isStick: boolean) => {
    window.siyuan.menus.menu.remove();
    element.previousElementSibling.previousElementSibling.classList.add("fn__none");
    element.classList.remove("fn__none");
    if (element.innerHTML) {
        return;
    }
    const localSearch = window.siyuan.storage[Constants.LOCAL_SEARCHUNREF] as ISearchAssetOption;
    element.parentElement.querySelector(".fn__loading--top").classList.remove("fn__none");
    element.innerHTML = `<div class="block__icons">
    <span data-type="unRefPrevious" class="block__icon block__icon--show ariaLabel" data-position="9bottom" disabled="disabled" aria-label="${window.siyuan.languages.previousLabel}"><svg><use xlink:href='#iconLeft'></use></svg></span>
    <span class="fn__space"></span>
    <span data-type="unRefNext" class="block__icon block__icon--show ariaLabel" data-position="9bottom" disabled="disabled" aria-label="${window.siyuan.languages.nextLabel}"><svg><use xlink:href='#iconRight'></use></svg></span>
    <span class="fn__space"></span>
    <span id="searchUnRefResult" class="ft__selectnone"></span>
    <span class="fn__flex-1"></span>
    <span class="fn__space"></span>
    <span id="unRefMore" aria-label="${window.siyuan.languages.more}" class="block__icon block__icon--show ariaLabel" data-position="9bottom">
        <svg><use xlink:href="#iconMore"></use></svg>
    </span>
    <span class="fn__space"></span>
    <span id="searchUnRefClose" aria-label="${isStick ? window.siyuan.languages.stickSearch : window.siyuan.languages.globalSearch}" class="block__icon block__icon--show ariaLabel" data-position="9bottom">
        <svg><use xlink:href="#iconBack"></use></svg>
    </span>
</div>
<div class="search__layout${localSearch.layout === 1 ? " search__layout--row" : ""}">
    <div id="searchUnRefList" class="fn__flex-1 search__list b3-list b3-list--background"></div>
    <div class="search__drag"></div>
    <div id="searchUnRefPreview" class="fn__flex-1 search__preview b3-typography" style="padding: 8px"></div>
</div>
<div class="search__tip${isStick ? " fn__none" : ""}">
    <kbd>↑/↓/PageUp/PageDown</kbd> ${window.siyuan.languages.searchTip1}
    <kbd>Enter/Double Click</kbd> ${window.siyuan.languages.searchTip2}
    <kbd>${updateHotkeyTip(window.siyuan.config.keymap.editor.general.insertRight.custom)}/${updateHotkeyTip("⌥Click")}</kbd> ${window.siyuan.languages.searchTip4}
    <kbd>Esc</kbd> ${window.siyuan.languages.searchTip5}
</div>`;
    if (element.querySelector("#searchUnRefList").innerHTML !== "") {
        return;
    }
    const edit = new Protyle(app, element.querySelector("#searchUnRefPreview") as HTMLElement, {
        blockId: "",
        render: {
            gutter: true,
            breadcrumbDocName: true
        },
    });
    if (localSearch.layout === 1) {
        if (localSearch.col) {
            edit.protyle.element.style.width = localSearch.col;
            edit.protyle.element.classList.remove("fn__flex-1");
        }
    } else {
        if (localSearch.row) {
            edit.protyle.element.classList.remove("fn__flex-1");
            edit.protyle.element.style.height = localSearch.row;
        }
    }

    const dragElement = element.querySelector(".search__drag");
    dragElement.addEventListener("mousedown", (event: MouseEvent) => {
        const documentSelf = document;
        const nextElement = dragElement.nextElementSibling as HTMLElement;
        const previousElement = dragElement.previousElementSibling as HTMLElement;
        const direction = localSearch.layout === 1 ? "lr" : "tb";
        const x = event[direction === "lr" ? "clientX" : "clientY"];
        const previousSize = direction === "lr" ? previousElement.clientWidth : previousElement.clientHeight;
        const nextSize = direction === "lr" ? nextElement.clientWidth : nextElement.clientHeight;

        nextElement.classList.remove("fn__flex-1");
        nextElement.style[direction === "lr" ? "width" : "height"] = nextSize + "px";

        documentSelf.onmousemove = (moveEvent: MouseEvent) => {
            moveEvent.preventDefault();
            moveEvent.stopPropagation();
            const previousNowSize = (previousSize + (moveEvent[direction === "lr" ? "clientX" : "clientY"] - x));
            const nextNowSize = (nextSize - (moveEvent[direction === "lr" ? "clientX" : "clientY"] - x));
            if (previousNowSize < 120 || nextNowSize < 120) {
                return;
            }
            nextElement.style[direction === "lr" ? "width" : "height"] = nextNowSize + "px";
        };

        documentSelf.onmouseup = () => {
            documentSelf.onmousemove = null;
            documentSelf.onmouseup = null;
            documentSelf.ondragstart = null;
            documentSelf.onselectstart = null;
            documentSelf.onselect = null;
            window.siyuan.storage[Constants.LOCAL_SEARCHUNREF][direction === "lr" ? "col" : "row"] = nextElement[direction === "lr" ? "clientWidth" : "clientHeight"] + "px";
            setStorageVal(Constants.LOCAL_SEARCHUNREF, window.siyuan.storage[Constants.LOCAL_SEARCHUNREF]);
            if (direction === "lr") {
                resize(edit.protyle);
            }
        };
    });
    getUnRefList(element, edit);
    return edit;
};

export const getUnRefList = (element: Element, edit: Protyle, page = 1) => {
    const previousElement = element.querySelector('[data-type="unRefPrevious"]');
    if (page > 1) {
        previousElement.removeAttribute("disabled");
    } else {
        previousElement.setAttribute("disabled", "disabled");
    }
    fetchPost("/api/search/listInvalidBlockRefs", {
        page,
    }, (response) => {
        element.parentElement.querySelector(".fn__loading--top").classList.add("fn__none");
        const nextElement = element.querySelector('[data-type="unRefNext"]');
        if (page < response.data.pageCount) {
            nextElement.removeAttribute("disabled");
        } else {
            nextElement.setAttribute("disabled", "disabled");
        }
        let resultHTML = "";
        response.data.blocks.forEach((item: IBlock, index: number) => {
            const title = getNotebookName(item.box) + getDisplayName(item.hPath, false);
            resultHTML += `<div data-type="search-item" class="b3-list-item${index === 0 ? " b3-list-item--focus" : ""}" data-node-id="${item.id}" data-root-id="${item.rootID}">
<svg class="b3-list-item__graphic"><use xlink:href="#${getIconByType(item.type)}"></use></svg>
${unicode2Emoji(item.ial.icon, "b3-list-item__graphic", true)}
<span class="b3-list-item__text">${item.content}</span>
${getAttr(item)}
<span class="b3-list-item__meta b3-list-item__meta--ellipsis ariaLabel" aria-label="${escapeAriaLabel(title)}">${escapeGreat(title)}</span>
</div>`;
        });
        if (response.data.blocks.length > 0) {
            edit.protyle.element.classList.remove("fn__none");
            element.querySelector(".search__drag")?.classList.remove("fn__none");
            getArticle({
                edit,
                id: response.data.blocks[0].id,
            });
        } else {
            edit.protyle.element.classList.add("fn__none");
            element.querySelector(".search__drag")?.classList.add("fn__none");
        }
        element.querySelector("#searchUnRefResult").innerHTML = `${page}/${response.data.pageCount || 1}<span class="fn__space"></span>
<span class="ft__on-surface">${window.siyuan.languages.findInDoc.replace("${x}", response.data.matchedRootCount).replace("${y}", response.data.matchedBlockCount)}</span>`;
        element.querySelector("#searchUnRefList").innerHTML = resultHTML || `<div class="search__empty">
    ${window.siyuan.languages.emptyContent}
</div>`;
    });
}

export const unRefMoreMenu = (target: Element, element: Element, edit: Protyle) => {
    const menu = new Menu("searchUnRefMore");
    if (menu.isOpen) {
        return;
    }
    const localData = window.siyuan.storage[Constants.LOCAL_SEARCHUNREF];
    /// #if !MOBILE
    menu.addItem({
        icon: "iconLayout",
        label: window.siyuan.languages.layout,
        type: "submenu",
        submenu: [{
            iconHTML: "",
            label: window.siyuan.languages.topBottomLayout,
            current: localData.layout === 0,
            click() {
                element.querySelector(".search__layout").classList.remove("search__layout--row");
                edit.protyle.element.style.width = "";
                if (localData.row) {
                    edit.protyle.element.style.height = localData.row;
                    edit.protyle.element.classList.remove("fn__flex-1");
                } else {
                    edit.protyle.element.classList.add("fn__flex-1");
                }
                resize(edit.protyle);
                localData.layout = 0;
                setStorageVal(Constants.LOCAL_SEARCHUNREF, window.siyuan.storage[Constants.LOCAL_SEARCHUNREF]);
            }
        }, {
            iconHTML: "",
            label: window.siyuan.languages.leftRightLayout,
            current: localData.layout === 1,
            click() {
                element.querySelector(".search__layout").classList.add("search__layout--row");
                edit.protyle.element.style.height = "";
                if (localData.col) {
                    edit.protyle.element.style.width = localData.col;
                    edit.protyle.element.classList.remove("fn__flex-1");
                } else {
                    edit.protyle.element.classList.add("fn__flex-1");
                }
                resize(edit.protyle);
                localData.layout = 1;
                setStorageVal(Constants.LOCAL_SEARCHUNREF, window.siyuan.storage[Constants.LOCAL_SEARCHUNREF]);
            }
        }]
    });
    /// #endif
    menu.addItem({
        icon: "iconRefresh",
        label: window.siyuan.languages.refresh,
        click() {
            element.parentElement.querySelector(".fn__loading--top").classList.remove("fn__none");
            getUnRefList(element, edit);
        },
    });
    /// #if MOBILE
    menu.fullscreen();
    /// #else
    const rect = target.getBoundingClientRect();
    menu.open({x: rect.right, y: rect.bottom, isLeft: true});
    /// #endif
};
