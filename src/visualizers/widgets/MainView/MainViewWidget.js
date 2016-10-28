/*globals $, WebGMEGlobal,define */
/*jshint browser: true*/

define([
    'panel/FloatingActionButton/styles/Materialize',
    'deepforge/globals',
    'text!./NavBar.html',
    'text!./ListItem.ejs',
    'underscore',
    'css!./styles/MainViewWidget.css',
    'css!./lib/font/css/open-iconic-bootstrap.min.css'
], function (
    Materialize,
    DeepForge,
    NavBarHTML,
    ListItem,
    _
) {
    'use strict';

    var MainViewWidget,
        WIDGET_CLASS = 'main-view',
        CATEGORIES = [
            'pipelines',
            'executions',
            'architectures',
            'artifacts'
        ];

    MainViewWidget = function (logger, container) {
        this.logger = logger.fork('Widget');
        this.$el = container;
        this.$el.addClass(WIDGET_CLASS);
        this.initialize();
        this.logger.debug('ctor finished');
        this._closed = true;
        this._currentSelection = '$pipelinesIcon';
    };

    MainViewWidget.prototype.initialize = function () {
        // Create the nav bar
        this.$nav = $(NavBarHTML);
        this.$el.append(this.$nav);

        // Execution support
        CATEGORIES.forEach(category => {
            var varName = `$${category}Icon`;
            this[varName] = this.$nav.find(`.${category}-icon`);
            this[varName].on('click', () => {
                this.setEmbeddedPanel(category);
                // Remove the 'active' class from the current
                this[this._currentSelection].removeClass('active');
                this[varName].addClass('active');
                this._currentSelection = varName;
            });
        });

        this.htmlFor = {};

        // TODO: Change this to check when a project is opened
        setTimeout(() => this.checkLibraries(), 1000);
    };

    MainViewWidget.prototype.checkLibraries = function () {

        if (!this.getProjectName()) {
            return;
        }

        this.checkLibUpdates()
            .then(updates => {
                if (updates.length) {  // prompt about updates
                    var names = updates.map(update => update[0]),
                        projName = this.getProjectName(),
                        content = $('<span>'),
                        msg = `${projName} is out of date. Click to update.`;

                    this.logger.info(`Updates available for ${names.join(', ')}`);

                    if (names.indexOf('nn') !== -1) {
                        msg = 'Newer nn library available. Click to update';
                    } else if (names.indexOf('pipeline') !== -1) {
                        msg = 'Execution updates available. Click to update';
                    }

                    content.text(msg);
                    content.on('click', () => {
                        // Remove the toast
                        content.parent().fadeOut();

                        // Create updating notification
                        msg = 'Updating execution library...';
                        if (names.indexOf('nn') !== -1) {
                            msg = 'Updating nn library...';
                        }

                        content.text(msg);
                        Materialize.toast(content, 8000);
                        this.updateLibraries(updates).then(() => {
                            content.parent().remove();
                            Materialize.toast('Update complete!', 2000);
                        });
                    });

                    Materialize.toast(content, 8000);
                }
            })
            .fail(err => Materialize.toast(`Library update check failed: ${err}`, 2000));
    };

    MainViewWidget.prototype.width = function () {
        return this._closedWidth;
    };

    MainViewWidget.prototype.onChanged = function () {
        if (!this._closed) {  // add the text back
            this.$nav.removeClass('hide-list');
        } else {
            this._closedWidth = this.$nav.width();
        }
    };

    MainViewWidget.prototype.onWidgetContainerResize = function () {
        var FOOTER_HEIGHT = 27;
        var rect = this.$el[0].getBoundingClientRect();

        //debugger;
        //// position myself below the north panel and above the south panel
        //this.$nav.css({
            //height: height + 'px'
        //});

        //if (this._closed) {
            //this._closedWidth = this.$nav.width();
        //}
    };

    /* * * * * * * * Visualizer life cycle callbacks * * * * * * * */
    MainViewWidget.prototype.destroy = function () {
    };

    MainViewWidget.prototype.onActivate = function () {
        this.logger.debug('MainViewWidget has been activated');
    };

    MainViewWidget.prototype.onDeactivate = function () {
        this.logger.debug('MainViewWidget has been deactivated');
    };

    return MainViewWidget;
});
