/*globals define,$*/
/*jshint browser: true*/

/**
 * Generated by VisualizerGenerator 1.7.0 from webgme on Tue May 24 2016 10:15:19 GMT-0500 (CDT).
 */

define([
    'widgets/EasyDAG/EasyDAGWidget',
    './SelectionManager',
    'underscore',
    'css!./styles/ExecutionViewWidget.css'
], function (
    EasyDAGWidget,
    SelectionManager,
    _
) {
    'use strict';

    var ExecutionViewWidget,
        WIDGET_CLASS = 'execution-view';

    ExecutionViewWidget = function (logger, container) {
        container.addClass(WIDGET_CLASS);
        EasyDAGWidget.call(this, logger, container);
        this.isSnapshot = true;
        this.originName = null;
        this.originTime = null;
    };

    _.extend(ExecutionViewWidget.prototype, EasyDAGWidget.prototype);

    ExecutionViewWidget.prototype.SelectionManager = SelectionManager;

    ExecutionViewWidget.prototype.getComponentId = function() {
        return 'ExecutionView';
    };

    ExecutionViewWidget.prototype.setExecutionNode = function(execNode) {
        this.isSnapshot = execNode.isSnapshot;
        this.originTime = execNode.createdAt;
        if (this.originName) {
            this.updateFooter();
        }
        this.setTitle();
    };

    ExecutionViewWidget.prototype.setOriginPipeline = function(name) {
        this.originName = name;
        this.updateFooter();
    };

    ExecutionViewWidget.prototype.setTitle = function(nodeName) {
        var title = nodeName === undefined ? this._currentTitle : nodeName;

        this._currentTitle = title;
        if (!this.isSnapshot) {
            title += ' (DEBUG)';
        }

        this._setTitle(title);
    };

    ExecutionViewWidget.prototype.onOriginDeleted = function() {
        this.originName = null;
        this.updateFooter();
    };

    ExecutionViewWidget.prototype.updateFooter = function() {
        var footer = this.getFooterContainer(),
            time = new Date(this.originTime).toLocaleString(),
            em,
            msg;

        if (this.originName === null) {
            msg = 'Originating pipeline has been deleted.';
            em = $('<em>');
            em.text(msg);
            footer.append(em);
        } else {
            msg = `Created from "${this.originName}"${time ? ' on ' + time : ''}`;
            footer.text(msg);
        }
    };

    return ExecutionViewWidget;
});
