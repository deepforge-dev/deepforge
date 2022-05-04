/*globals define, monaco*/
/*jshint browser: true*/

define([
    'widgets/TextEditor/TextEditorWidget',
    'underscore',
    'css!./styles/OperationCodeEditorWidget.css'
], function (
    TextEditorWidget,
    _,
) {
    'use strict';

    var OperationCodeEditorWidget;
        //WIDGET_CLASS = 'operation-editor';

    OperationCodeEditorWidget = function (logger, container) {
        TextEditorWidget.call(this, logger, container);
        this.lineOffset = 0;
        // Add the shift-enter command
        this.editor.addCommand(
            monaco.KeyMod.Shift | monaco.KeyCode.Enter,
            this.handleOperationExecute.bind(this)
        );
        this.editor.updateOptions({
            lineNumbers: this.updateOffset.bind(this)
        });
    };

    OperationCodeEditorWidget.prototype.handleOperationExecute = function () {
        return this.executeOrStopJob(...arguments);
    };

    _.extend(OperationCodeEditorWidget.prototype, TextEditorWidget.prototype);

    OperationCodeEditorWidget.prototype.getHeader = function (desc) {
        // Add comment about the inputs, attributes and references
        var header = [
            `Editing "${desc.name}" Implementation`
        ];

        header.push('');
        header.push('The \'execute\' method will be called when the operation is run');

        return this.comment(header.join('\n'));
    };

    OperationCodeEditorWidget.prototype.addNode = function (desc) {
        TextEditorWidget.prototype.addNode.call(this, desc);
        this.updateOffset();
    };

    OperationCodeEditorWidget.prototype.setLineOffset = function (offset) {
        if (this.lineOffset !== offset) {
            this.lineOffset = offset;
        }
    };

    OperationCodeEditorWidget.prototype.updateOffset = function (originalLineNumber) {
        var lines,
            actualOffset;

        lines = this.currentHeader.match(/\n/g);
        actualOffset = this.lineOffset - (lines ? lines.length + 1 : 0);
        return (originalLineNumber + actualOffset);
    };

    return OperationCodeEditorWidget;
});
