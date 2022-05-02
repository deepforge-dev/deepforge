/*globals define, _, monaco*/
/*jshint browser: true*/

define([
    'widgets/TextEditor/TextEditorWidget',
    './lib/AnsiParser',
    'css!./styles/LogViewerWidget.css'
], function (
    TextEditorWidget,
    AnsiParser,
) {
    'use strict';

    const ANSI_COLORS = {
        '\u001b[30m': 'black',
        '\u001b[31m': 'red',
        '\u001b[32m': 'green',
        '\u001b[33m': 'yellow',
        '\u001b[34m': 'blue',
        '\u001b[35m': 'magenta',
        '\u001b[36m': 'cyan',
        '\u001b[90m': 'gray'
    };

    const LogViewerWidget = function () {
        this.readOnly = true;
        TextEditorWidget.apply(this, arguments);
        this._el.addClass('log-viewer');
        this.editor.updateOptions({
            lineNumbers: this.getLineNumbers
        });
        this.setReadOnly(true);
        this.ansiParser = AnsiParser();
    };

    _.extend(LogViewerWidget.prototype, TextEditorWidget.prototype);

    LogViewerWidget.prototype.getHeader = function(desc) {
        return `Console logging for Operation "${desc.name}":\n`;
    };

    LogViewerWidget.prototype.getLineNumbers = function(lineno) {
        return lineno - 2;
    };

    LogViewerWidget.prototype.addNode = function(desc) {
        TextEditorWidget.prototype.addNode.call(this, desc);
        const revealLineno = Math.ceil(this.model.getLineCount()/2);
        this.editor.revealLineInCenter(
            revealLineno,
            monaco.editor.ScrollType.Smooth
        );
        this.renderAnsi();
    };

    LogViewerWidget.prototype.getDefaultEditorOptions = function() {
        const opts = TextEditorWidget.prototype.getDefaultEditorOptions.call(this);
        opts.fontSize = 10;
        return opts;
    };

    LogViewerWidget.prototype.getMenuItemsFor = function() {
        const menu = TextEditorWidget.prototype.getMenuItemsFor.call(this);
        delete menu.setKeybindings;
        return menu;
    };

    LogViewerWidget.prototype.renderAnsi = function () {
        const model = this.editor.getModel();
        const ansiText = model.getLinesContent();
        model.setValue(this.ansiParser.removeAnsi(model.getValue()));
        const decorations = this.ansiParser
            .parse(ansiText)
            .map(LogViewerWidget.monacoAnsiDecorations);
        this.editor.deltaDecorations([], decorations.flat());
    };

    // Get the editor text and update wrt ansi colors
    LogViewerWidget.monacoAnsiDecorations = function(lineStyles, lineNo) {
        const styles = lineStyles.map(s => s.style);
        let decorations = [];
        let ansiBegin=0, ansiEnd=0;

        while(ansiBegin < styles.length) {
            if(!ANSI_COLORS[styles[ansiBegin]]) {
                ansiEnd = ++ansiBegin + 1;
            } else {
                while (ansiEnd < styles.length && styles[ansiBegin] === styles[ansiEnd]) {
                    ansiEnd++;
                }
                decorations.push({
                    range: new monaco.Range(lineNo + 1, ansiBegin, lineNo + 1, ansiEnd+1),
                    options: {
                        inlineClassName: `ansi-${ANSI_COLORS[styles[ansiBegin]]}`
                    }
                });
                ansiBegin = ansiEnd++;
            }
        }
        return decorations;
    };

    return LogViewerWidget;
});
