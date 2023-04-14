"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.filterMap = exports.readFile = exports.isDefined = exports.isObject = exports.encodeQueryParams = exports.openUrl = exports.capitalize = exports.getLatestArtifact = exports.assert = exports.arraysEqual = exports.Result = void 0;
/**
 * A Result is the result from a request. Errors can be mapped (like
 * combinators). Unwrapping the result will either throw an error (if an error
 * occurred) or return the parsed result from the request.
 */
var Result = /** @class */ (function () {
    function Result(value, error) {
        this._value = value;
        this._error = error;
    }
    Result.prototype.map = function (fn) {
        if (this._error) {
            return new Result(null, this._error);
        }
        else {
            var result = fn(this._value);
            return new Result(result, null);
        }
    };
    Result.prototype.mapError = function (errFn) {
        if (this._error) {
            var result = errFn(this._error);
            return new Result(null, result);
        }
        else {
            return new Result(this._value, null);
        }
    };
    Result.prototype.unwrap = function () {
        if (this._error) {
            throw this._error;
        }
        else {
            return this._value;
        }
    };
    return Result;
}());
exports.Result = Result;
/**
 * Returns whether the two arrays are equal.
 *
 * @template T The type of the array elements.
 * @param array1 The first array to compare.
 * @param array2 The second array to compare.
 * @param [options] Options for the comparison. If `ignoreOrder` is `true`, then both arrays are sorted before comparison.
 * @return `true` if the arrays are equal, `false` otherwise.
 */
function arraysEqual(array1, array2, options) {
    var _a;
    if (array1 === array2)
        return true;
    if (array1.length !== array2.length)
        return false;
    var _b = (options === null || options === void 0 ? void 0 : options.ignoreOrder)
        ? [__spreadArray([], array1, true).sort(), __spreadArray([], array2, true).sort()]
        : [array1, array2], arr1 = _b[0], arr2 = _b[1];
    var equals = (_a = options === null || options === void 0 ? void 0 : options.equals) !== null && _a !== void 0 ? _a : Object.is;
    return !arr1.some(function (elem, index) { return !equals(elem, arr2[index]); });
}
exports.arraysEqual = arraysEqual;
function assert(cond, err) {
    if (!cond) {
        throw err;
    }
}
exports.assert = assert;
// FIXME: we need to combine Artifact.js (in the router directory) w/ a TS
// definition and share the generated code across the client and server. This
// method should be available on the ArtifactSet class instead of here
function getLatestArtifact(artifactSet) {
    artifactSet.children.sort(function (i1, i2) {
        if (i1.time === i2.time) {
            return i1.displayName < i2.displayName ? -1 : 1;
        }
        return i1.time < i2.time ? -1 : 1;
    });
    return artifactSet.children[artifactSet.children.length - 1];
}
exports.getLatestArtifact = getLatestArtifact;
function capitalize(word) {
    return word[0].toUpperCase() + word.substring(1);
}
exports.capitalize = capitalize;
function openUrl(url) {
    return window.open(url, "_blank");
}
exports.openUrl = openUrl;
function encodeQueryParams(dict) {
    return Object.entries(dict)
        .map(function (_a) {
        var key = _a[0], value = _a[1];
        return "".concat(key, "=").concat(encodeURIComponent(value));
    })
        .join("&");
}
exports.encodeQueryParams = encodeQueryParams;
function isObject(thing) {
    return typeof thing === "object" && !Array.isArray(thing);
}
exports.isObject = isObject;
function isDefined(thing) {
    return (thing != null) || (thing === null);
}
exports.isDefined = isDefined;
function readFile(file) {
    return __awaiter(this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            return [2 /*return*/, new Promise(function (res, rej) {
                    var reader = new FileReader();
                    reader.onload = function () {
                        if (reader.error) {
                            console.log("error:", reader.error);
                            return rej(reader.error);
                        }
                        else {
                            return res(reader.result);
                        }
                    };
                    reader.readAsText(file);
                })];
        });
    });
}
exports.readFile = readFile;
function filterMap(list, fn) {
    return list.reduce(function (items, input) {
        var mapped = fn(input);
        if (isDefined(mapped)) {
            items.push(mapped);
        }
        return items;
    }, []);
}
exports.filterMap = filterMap;
