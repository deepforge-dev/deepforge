/*globals define, */
/**
 * Generated by VisualizerGenerator 1.7.0 from webgme on Thu Mar 12 2020 13:23:53 GMT-0500 (Central Daylight Time).
 */

define([
    'js/PanelBase/PanelBaseWithHeader',
    'widgets/TextEditor/TextEditorWidget',
    'panels/TextEditor/TextEditorControl',
    'panels/TextEditor/TextEditorPanel',
    'deepforge/Constants',
    'text!./environment.yml.tpl',
], function (
    PanelBaseWithHeader,
    TextEditorWidget,
    TextEditorControl,
    TextEditorPanel,
    Constants,
    EnvTemplateTxt,
) {
    'use strict';

    function OperationDepEditorPanel(layoutManager, params) {
        var options = {};
        //set properties from options
        options[PanelBaseWithHeader.OPTIONS.LOGGER_INSTANCE_NAME] = 'OperationDepEditorPanel';
        options[PanelBaseWithHeader.OPTIONS.FLOATING_TITLE] = true;

        //call parent's constructor
        PanelBaseWithHeader.apply(this, [options, layoutManager]);

        this._client = params.client;
        this._embedded = params.embedded;

        //initialize UI
        this._initialize();

        this.logger.debug('ctor finished');
    }

    OperationDepEditorPanel.prototype = Object.create(TextEditorPanel.prototype);

    OperationDepEditorPanel.prototype._initialize = function () {
        var self = this;

        //set Widget title
        this.setTitle('');

        const config = {language: 'yaml', displayMiniMap: false};
        this.widget = new TextEditorWidget(this.logger, this.$el, config);

        this.widget.setTitle = function (title) {
            self.setTitle(title);
        };

        const opts = {
            logger: this.logger,
            client: this._client,
            embedded: this._embedded,
            widget: this.widget,
        };
        opts.attributeName = Constants.OPERATION.ENV;
        opts.defaultTemplate = EnvTemplateTxt;
        this.control = new TextEditorControl(opts);

        this.onActivate();
    };

    return OperationDepEditorPanel;
});
