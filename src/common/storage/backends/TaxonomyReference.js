"use strict";
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (Object.prototype.hasOwnProperty.call(b, p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        if (typeof b !== "function" && b !== null)
            throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.SemanticVersion = exports.ParseError = exports.Branch = exports.Tag = exports.Commit = void 0;
var TaxonomyReference = /** @class */ (function () {
    function TaxonomyReference(id, version) {
        this.id = id;
        this.version = version;
    }
    TaxonomyReference.prototype.supports = function (otherVersion) {
        return this.id === otherVersion.id &&
            this.version.supports(otherVersion.version);
    };
    TaxonomyReference.from = function (taxonomyVersion) {
        var version;
        if (taxonomyVersion.tag) {
            version = new Tag(taxonomyVersion.commit, taxonomyVersion.tag);
        }
        else if (taxonomyVersion.branch) {
            version = new Branch(taxonomyVersion.commit, taxonomyVersion.branch);
        }
        else if (taxonomyVersion.commit) {
            version = new Commit(taxonomyVersion.commit);
        }
        else {
            var taxVersion = JSON.stringify(taxonomyVersion);
            throw new Error("Could not find tag, branch, or commit in ".concat(taxVersion));
        }
        return new TaxonomyReference(taxonomyVersion.id, version);
    };
    return TaxonomyReference;
}());
exports.default = TaxonomyReference;
var Commit = /** @class */ (function () {
    function Commit(hash) {
        this.hash = hash;
    }
    Commit.prototype.supports = function (otherVersion) {
        return otherVersion.hash === this.hash;
    };
    return Commit;
}());
exports.Commit = Commit;
var Tag = /** @class */ (function (_super) {
    __extends(Tag, _super);
    function Tag(hash, versionString) {
        var _this = _super.call(this, hash) || this;
        _this.version = SemanticVersion.parse(versionString);
        return _this;
    }
    Tag.prototype.supports = function (otherTag) {
        if (otherTag instanceof Tag) {
            return this.version.major === otherTag.version.major &&
                this.version.gte(otherTag.version);
        }
        else {
            return _super.prototype.supports.call(this, otherTag);
        }
    };
    return Tag;
}(Commit));
exports.Tag = Tag;
var Branch = /** @class */ (function (_super) {
    __extends(Branch, _super);
    function Branch(hash, name) {
        var _this = _super.call(this, hash) || this;
        _this.name = name;
        return _this;
    }
    Branch.prototype.supports = function (otherVersion) {
        if (otherVersion instanceof Branch) {
            return otherVersion.name === this.name;
        }
        else {
            return _super.prototype.supports.call(this, otherVersion);
        }
    };
    return Branch;
}(Commit));
exports.Branch = Branch;
var ParseError = /** @class */ (function (_super) {
    __extends(ParseError, _super);
    function ParseError(input) {
        return _super.call(this, "Unable to parse: ".concat(input)) || this;
    }
    return ParseError;
}(Error));
exports.ParseError = ParseError;
var SemanticVersion = /** @class */ (function () {
    function SemanticVersion(major, minor, patch) {
        if (minor === void 0) { minor = 0; }
        if (patch === void 0) { patch = 0; }
        this.major = major;
        this.minor = minor;
        this.patch = patch;
    }
    SemanticVersion.prototype.gte = function (other) {
        if (this.major < other.major)
            return false;
        if (this.minor < other.minor)
            return false;
        if (this.patch < other.patch)
            return false;
        return true;
    };
    SemanticVersion.parse = function (versionString) {
        versionString = versionString.replace(/^v?/, "");
        var _a = versionString.split(".")
            .map(function (str) {
            if (!/\d+/.test(str)) {
                throw new ParseError(versionString);
            }
            return parseInt(str);
        }), major = _a[0], _b = _a[1], minor = _b === void 0 ? 0 : _b, _c = _a[2], patch = _c === void 0 ? 0 : _c;
        return new SemanticVersion(major, minor, patch);
    };
    return SemanticVersion;
}());
exports.SemanticVersion = SemanticVersion;
