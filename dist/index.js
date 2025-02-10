// src/actions/getMarkets.ts
import {
  composeContext,
  elizaLogger as elizaLogger2,
  generateObject,
  ModelClass
} from "@elizaos/core";
import axios2 from "axios";

// ../../node_modules/zod/lib/index.mjs
var util;
(function(util2) {
  util2.assertEqual = (val) => val;
  function assertIs(_arg) {
  }
  util2.assertIs = assertIs;
  function assertNever(_x) {
    throw new Error();
  }
  util2.assertNever = assertNever;
  util2.arrayToEnum = (items) => {
    const obj = {};
    for (const item of items) {
      obj[item] = item;
    }
    return obj;
  };
  util2.getValidEnumValues = (obj) => {
    const validKeys = util2.objectKeys(obj).filter((k) => typeof obj[obj[k]] !== "number");
    const filtered = {};
    for (const k of validKeys) {
      filtered[k] = obj[k];
    }
    return util2.objectValues(filtered);
  };
  util2.objectValues = (obj) => {
    return util2.objectKeys(obj).map(function(e) {
      return obj[e];
    });
  };
  util2.objectKeys = typeof Object.keys === "function" ? (obj) => Object.keys(obj) : (object) => {
    const keys = [];
    for (const key in object) {
      if (Object.prototype.hasOwnProperty.call(object, key)) {
        keys.push(key);
      }
    }
    return keys;
  };
  util2.find = (arr, checker) => {
    for (const item of arr) {
      if (checker(item))
        return item;
    }
    return void 0;
  };
  util2.isInteger = typeof Number.isInteger === "function" ? (val) => Number.isInteger(val) : (val) => typeof val === "number" && isFinite(val) && Math.floor(val) === val;
  function joinValues(array, separator = " | ") {
    return array.map((val) => typeof val === "string" ? `'${val}'` : val).join(separator);
  }
  util2.joinValues = joinValues;
  util2.jsonStringifyReplacer = (_, value) => {
    if (typeof value === "bigint") {
      return value.toString();
    }
    return value;
  };
})(util || (util = {}));
var objectUtil;
(function(objectUtil2) {
  objectUtil2.mergeShapes = (first, second) => {
    return {
      ...first,
      ...second
      // second overwrites first
    };
  };
})(objectUtil || (objectUtil = {}));
var ZodParsedType = util.arrayToEnum([
  "string",
  "nan",
  "number",
  "integer",
  "float",
  "boolean",
  "date",
  "bigint",
  "symbol",
  "function",
  "undefined",
  "null",
  "array",
  "object",
  "unknown",
  "promise",
  "void",
  "never",
  "map",
  "set"
]);
var getParsedType = (data) => {
  const t = typeof data;
  switch (t) {
    case "undefined":
      return ZodParsedType.undefined;
    case "string":
      return ZodParsedType.string;
    case "number":
      return isNaN(data) ? ZodParsedType.nan : ZodParsedType.number;
    case "boolean":
      return ZodParsedType.boolean;
    case "function":
      return ZodParsedType.function;
    case "bigint":
      return ZodParsedType.bigint;
    case "symbol":
      return ZodParsedType.symbol;
    case "object":
      if (Array.isArray(data)) {
        return ZodParsedType.array;
      }
      if (data === null) {
        return ZodParsedType.null;
      }
      if (data.then && typeof data.then === "function" && data.catch && typeof data.catch === "function") {
        return ZodParsedType.promise;
      }
      if (typeof Map !== "undefined" && data instanceof Map) {
        return ZodParsedType.map;
      }
      if (typeof Set !== "undefined" && data instanceof Set) {
        return ZodParsedType.set;
      }
      if (typeof Date !== "undefined" && data instanceof Date) {
        return ZodParsedType.date;
      }
      return ZodParsedType.object;
    default:
      return ZodParsedType.unknown;
  }
};
var ZodIssueCode = util.arrayToEnum([
  "invalid_type",
  "invalid_literal",
  "custom",
  "invalid_union",
  "invalid_union_discriminator",
  "invalid_enum_value",
  "unrecognized_keys",
  "invalid_arguments",
  "invalid_return_type",
  "invalid_date",
  "invalid_string",
  "too_small",
  "too_big",
  "invalid_intersection_types",
  "not_multiple_of",
  "not_finite"
]);
var quotelessJson = (obj) => {
  const json = JSON.stringify(obj, null, 2);
  return json.replace(/"([^"]+)":/g, "$1:");
};
var ZodError = class _ZodError extends Error {
  get errors() {
    return this.issues;
  }
  constructor(issues) {
    super();
    this.issues = [];
    this.addIssue = (sub) => {
      this.issues = [...this.issues, sub];
    };
    this.addIssues = (subs = []) => {
      this.issues = [...this.issues, ...subs];
    };
    const actualProto = new.target.prototype;
    if (Object.setPrototypeOf) {
      Object.setPrototypeOf(this, actualProto);
    } else {
      this.__proto__ = actualProto;
    }
    this.name = "ZodError";
    this.issues = issues;
  }
  format(_mapper) {
    const mapper = _mapper || function(issue) {
      return issue.message;
    };
    const fieldErrors = { _errors: [] };
    const processError = (error) => {
      for (const issue of error.issues) {
        if (issue.code === "invalid_union") {
          issue.unionErrors.map(processError);
        } else if (issue.code === "invalid_return_type") {
          processError(issue.returnTypeError);
        } else if (issue.code === "invalid_arguments") {
          processError(issue.argumentsError);
        } else if (issue.path.length === 0) {
          fieldErrors._errors.push(mapper(issue));
        } else {
          let curr = fieldErrors;
          let i = 0;
          while (i < issue.path.length) {
            const el = issue.path[i];
            const terminal = i === issue.path.length - 1;
            if (!terminal) {
              curr[el] = curr[el] || { _errors: [] };
            } else {
              curr[el] = curr[el] || { _errors: [] };
              curr[el]._errors.push(mapper(issue));
            }
            curr = curr[el];
            i++;
          }
        }
      }
    };
    processError(this);
    return fieldErrors;
  }
  static assert(value) {
    if (!(value instanceof _ZodError)) {
      throw new Error(`Not a ZodError: ${value}`);
    }
  }
  toString() {
    return this.message;
  }
  get message() {
    return JSON.stringify(this.issues, util.jsonStringifyReplacer, 2);
  }
  get isEmpty() {
    return this.issues.length === 0;
  }
  flatten(mapper = (issue) => issue.message) {
    const fieldErrors = {};
    const formErrors = [];
    for (const sub of this.issues) {
      if (sub.path.length > 0) {
        fieldErrors[sub.path[0]] = fieldErrors[sub.path[0]] || [];
        fieldErrors[sub.path[0]].push(mapper(sub));
      } else {
        formErrors.push(mapper(sub));
      }
    }
    return { formErrors, fieldErrors };
  }
  get formErrors() {
    return this.flatten();
  }
};
ZodError.create = (issues) => {
  const error = new ZodError(issues);
  return error;
};
var errorMap = (issue, _ctx) => {
  let message;
  switch (issue.code) {
    case ZodIssueCode.invalid_type:
      if (issue.received === ZodParsedType.undefined) {
        message = "Required";
      } else {
        message = `Expected ${issue.expected}, received ${issue.received}`;
      }
      break;
    case ZodIssueCode.invalid_literal:
      message = `Invalid literal value, expected ${JSON.stringify(issue.expected, util.jsonStringifyReplacer)}`;
      break;
    case ZodIssueCode.unrecognized_keys:
      message = `Unrecognized key(s) in object: ${util.joinValues(issue.keys, ", ")}`;
      break;
    case ZodIssueCode.invalid_union:
      message = `Invalid input`;
      break;
    case ZodIssueCode.invalid_union_discriminator:
      message = `Invalid discriminator value. Expected ${util.joinValues(issue.options)}`;
      break;
    case ZodIssueCode.invalid_enum_value:
      message = `Invalid enum value. Expected ${util.joinValues(issue.options)}, received '${issue.received}'`;
      break;
    case ZodIssueCode.invalid_arguments:
      message = `Invalid function arguments`;
      break;
    case ZodIssueCode.invalid_return_type:
      message = `Invalid function return type`;
      break;
    case ZodIssueCode.invalid_date:
      message = `Invalid date`;
      break;
    case ZodIssueCode.invalid_string:
      if (typeof issue.validation === "object") {
        if ("includes" in issue.validation) {
          message = `Invalid input: must include "${issue.validation.includes}"`;
          if (typeof issue.validation.position === "number") {
            message = `${message} at one or more positions greater than or equal to ${issue.validation.position}`;
          }
        } else if ("startsWith" in issue.validation) {
          message = `Invalid input: must start with "${issue.validation.startsWith}"`;
        } else if ("endsWith" in issue.validation) {
          message = `Invalid input: must end with "${issue.validation.endsWith}"`;
        } else {
          util.assertNever(issue.validation);
        }
      } else if (issue.validation !== "regex") {
        message = `Invalid ${issue.validation}`;
      } else {
        message = "Invalid";
      }
      break;
    case ZodIssueCode.too_small:
      if (issue.type === "array")
        message = `Array must contain ${issue.exact ? "exactly" : issue.inclusive ? `at least` : `more than`} ${issue.minimum} element(s)`;
      else if (issue.type === "string")
        message = `String must contain ${issue.exact ? "exactly" : issue.inclusive ? `at least` : `over`} ${issue.minimum} character(s)`;
      else if (issue.type === "number")
        message = `Number must be ${issue.exact ? `exactly equal to ` : issue.inclusive ? `greater than or equal to ` : `greater than `}${issue.minimum}`;
      else if (issue.type === "date")
        message = `Date must be ${issue.exact ? `exactly equal to ` : issue.inclusive ? `greater than or equal to ` : `greater than `}${new Date(Number(issue.minimum))}`;
      else
        message = "Invalid input";
      break;
    case ZodIssueCode.too_big:
      if (issue.type === "array")
        message = `Array must contain ${issue.exact ? `exactly` : issue.inclusive ? `at most` : `less than`} ${issue.maximum} element(s)`;
      else if (issue.type === "string")
        message = `String must contain ${issue.exact ? `exactly` : issue.inclusive ? `at most` : `under`} ${issue.maximum} character(s)`;
      else if (issue.type === "number")
        message = `Number must be ${issue.exact ? `exactly` : issue.inclusive ? `less than or equal to` : `less than`} ${issue.maximum}`;
      else if (issue.type === "bigint")
        message = `BigInt must be ${issue.exact ? `exactly` : issue.inclusive ? `less than or equal to` : `less than`} ${issue.maximum}`;
      else if (issue.type === "date")
        message = `Date must be ${issue.exact ? `exactly` : issue.inclusive ? `smaller than or equal to` : `smaller than`} ${new Date(Number(issue.maximum))}`;
      else
        message = "Invalid input";
      break;
    case ZodIssueCode.custom:
      message = `Invalid input`;
      break;
    case ZodIssueCode.invalid_intersection_types:
      message = `Intersection results could not be merged`;
      break;
    case ZodIssueCode.not_multiple_of:
      message = `Number must be a multiple of ${issue.multipleOf}`;
      break;
    case ZodIssueCode.not_finite:
      message = "Number must be finite";
      break;
    default:
      message = _ctx.defaultError;
      util.assertNever(issue);
  }
  return { message };
};
var overrideErrorMap = errorMap;
function setErrorMap(map) {
  overrideErrorMap = map;
}
function getErrorMap() {
  return overrideErrorMap;
}
var makeIssue = (params) => {
  const { data, path, errorMaps, issueData } = params;
  const fullPath = [...path, ...issueData.path || []];
  const fullIssue = {
    ...issueData,
    path: fullPath
  };
  if (issueData.message !== void 0) {
    return {
      ...issueData,
      path: fullPath,
      message: issueData.message
    };
  }
  let errorMessage = "";
  const maps = errorMaps.filter((m) => !!m).slice().reverse();
  for (const map of maps) {
    errorMessage = map(fullIssue, { data, defaultError: errorMessage }).message;
  }
  return {
    ...issueData,
    path: fullPath,
    message: errorMessage
  };
};
var EMPTY_PATH = [];
function addIssueToContext(ctx, issueData) {
  const overrideMap = getErrorMap();
  const issue = makeIssue({
    issueData,
    data: ctx.data,
    path: ctx.path,
    errorMaps: [
      ctx.common.contextualErrorMap,
      // contextual error map is first priority
      ctx.schemaErrorMap,
      // then schema-bound map if available
      overrideMap,
      // then global override map
      overrideMap === errorMap ? void 0 : errorMap
      // then global default map
    ].filter((x) => !!x)
  });
  ctx.common.issues.push(issue);
}
var ParseStatus = class _ParseStatus {
  constructor() {
    this.value = "valid";
  }
  dirty() {
    if (this.value === "valid")
      this.value = "dirty";
  }
  abort() {
    if (this.value !== "aborted")
      this.value = "aborted";
  }
  static mergeArray(status, results) {
    const arrayValue = [];
    for (const s of results) {
      if (s.status === "aborted")
        return INVALID;
      if (s.status === "dirty")
        status.dirty();
      arrayValue.push(s.value);
    }
    return { status: status.value, value: arrayValue };
  }
  static async mergeObjectAsync(status, pairs) {
    const syncPairs = [];
    for (const pair of pairs) {
      const key = await pair.key;
      const value = await pair.value;
      syncPairs.push({
        key,
        value
      });
    }
    return _ParseStatus.mergeObjectSync(status, syncPairs);
  }
  static mergeObjectSync(status, pairs) {
    const finalObject = {};
    for (const pair of pairs) {
      const { key, value } = pair;
      if (key.status === "aborted")
        return INVALID;
      if (value.status === "aborted")
        return INVALID;
      if (key.status === "dirty")
        status.dirty();
      if (value.status === "dirty")
        status.dirty();
      if (key.value !== "__proto__" && (typeof value.value !== "undefined" || pair.alwaysSet)) {
        finalObject[key.value] = value.value;
      }
    }
    return { status: status.value, value: finalObject };
  }
};
var INVALID = Object.freeze({
  status: "aborted"
});
var DIRTY = (value) => ({ status: "dirty", value });
var OK = (value) => ({ status: "valid", value });
var isAborted = (x) => x.status === "aborted";
var isDirty = (x) => x.status === "dirty";
var isValid = (x) => x.status === "valid";
var isAsync = (x) => typeof Promise !== "undefined" && x instanceof Promise;
function __classPrivateFieldGet(receiver, state, kind, f) {
  if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a getter");
  if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot read private member from an object whose class did not declare it");
  return kind === "m" ? f : kind === "a" ? f.call(receiver) : f ? f.value : state.get(receiver);
}
function __classPrivateFieldSet(receiver, state, value, kind, f) {
  if (kind === "m") throw new TypeError("Private method is not writable");
  if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a setter");
  if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot write private member to an object whose class did not declare it");
  return kind === "a" ? f.call(receiver, value) : f ? f.value = value : state.set(receiver, value), value;
}
var errorUtil;
(function(errorUtil2) {
  errorUtil2.errToObj = (message) => typeof message === "string" ? { message } : message || {};
  errorUtil2.toString = (message) => typeof message === "string" ? message : message === null || message === void 0 ? void 0 : message.message;
})(errorUtil || (errorUtil = {}));
var _ZodEnum_cache;
var _ZodNativeEnum_cache;
var ParseInputLazyPath = class {
  constructor(parent, value, path, key) {
    this._cachedPath = [];
    this.parent = parent;
    this.data = value;
    this._path = path;
    this._key = key;
  }
  get path() {
    if (!this._cachedPath.length) {
      if (this._key instanceof Array) {
        this._cachedPath.push(...this._path, ...this._key);
      } else {
        this._cachedPath.push(...this._path, this._key);
      }
    }
    return this._cachedPath;
  }
};
var handleResult = (ctx, result) => {
  if (isValid(result)) {
    return { success: true, data: result.value };
  } else {
    if (!ctx.common.issues.length) {
      throw new Error("Validation failed but no issues detected.");
    }
    return {
      success: false,
      get error() {
        if (this._error)
          return this._error;
        const error = new ZodError(ctx.common.issues);
        this._error = error;
        return this._error;
      }
    };
  }
};
function processCreateParams(params) {
  if (!params)
    return {};
  const { errorMap: errorMap2, invalid_type_error, required_error, description } = params;
  if (errorMap2 && (invalid_type_error || required_error)) {
    throw new Error(`Can't use "invalid_type_error" or "required_error" in conjunction with custom error map.`);
  }
  if (errorMap2)
    return { errorMap: errorMap2, description };
  const customMap = (iss, ctx) => {
    var _a, _b;
    const { message } = params;
    if (iss.code === "invalid_enum_value") {
      return { message: message !== null && message !== void 0 ? message : ctx.defaultError };
    }
    if (typeof ctx.data === "undefined") {
      return { message: (_a = message !== null && message !== void 0 ? message : required_error) !== null && _a !== void 0 ? _a : ctx.defaultError };
    }
    if (iss.code !== "invalid_type")
      return { message: ctx.defaultError };
    return { message: (_b = message !== null && message !== void 0 ? message : invalid_type_error) !== null && _b !== void 0 ? _b : ctx.defaultError };
  };
  return { errorMap: customMap, description };
}
var ZodType = class {
  get description() {
    return this._def.description;
  }
  _getType(input) {
    return getParsedType(input.data);
  }
  _getOrReturnCtx(input, ctx) {
    return ctx || {
      common: input.parent.common,
      data: input.data,
      parsedType: getParsedType(input.data),
      schemaErrorMap: this._def.errorMap,
      path: input.path,
      parent: input.parent
    };
  }
  _processInputParams(input) {
    return {
      status: new ParseStatus(),
      ctx: {
        common: input.parent.common,
        data: input.data,
        parsedType: getParsedType(input.data),
        schemaErrorMap: this._def.errorMap,
        path: input.path,
        parent: input.parent
      }
    };
  }
  _parseSync(input) {
    const result = this._parse(input);
    if (isAsync(result)) {
      throw new Error("Synchronous parse encountered promise.");
    }
    return result;
  }
  _parseAsync(input) {
    const result = this._parse(input);
    return Promise.resolve(result);
  }
  parse(data, params) {
    const result = this.safeParse(data, params);
    if (result.success)
      return result.data;
    throw result.error;
  }
  safeParse(data, params) {
    var _a;
    const ctx = {
      common: {
        issues: [],
        async: (_a = params === null || params === void 0 ? void 0 : params.async) !== null && _a !== void 0 ? _a : false,
        contextualErrorMap: params === null || params === void 0 ? void 0 : params.errorMap
      },
      path: (params === null || params === void 0 ? void 0 : params.path) || [],
      schemaErrorMap: this._def.errorMap,
      parent: null,
      data,
      parsedType: getParsedType(data)
    };
    const result = this._parseSync({ data, path: ctx.path, parent: ctx });
    return handleResult(ctx, result);
  }
  "~validate"(data) {
    var _a, _b;
    const ctx = {
      common: {
        issues: [],
        async: !!this["~standard"].async
      },
      path: [],
      schemaErrorMap: this._def.errorMap,
      parent: null,
      data,
      parsedType: getParsedType(data)
    };
    if (!this["~standard"].async) {
      try {
        const result = this._parseSync({ data, path: [], parent: ctx });
        return isValid(result) ? {
          value: result.value
        } : {
          issues: ctx.common.issues
        };
      } catch (err) {
        if ((_b = (_a = err === null || err === void 0 ? void 0 : err.message) === null || _a === void 0 ? void 0 : _a.toLowerCase()) === null || _b === void 0 ? void 0 : _b.includes("encountered")) {
          this["~standard"].async = true;
        }
        ctx.common = {
          issues: [],
          async: true
        };
      }
    }
    return this._parseAsync({ data, path: [], parent: ctx }).then((result) => isValid(result) ? {
      value: result.value
    } : {
      issues: ctx.common.issues
    });
  }
  async parseAsync(data, params) {
    const result = await this.safeParseAsync(data, params);
    if (result.success)
      return result.data;
    throw result.error;
  }
  async safeParseAsync(data, params) {
    const ctx = {
      common: {
        issues: [],
        contextualErrorMap: params === null || params === void 0 ? void 0 : params.errorMap,
        async: true
      },
      path: (params === null || params === void 0 ? void 0 : params.path) || [],
      schemaErrorMap: this._def.errorMap,
      parent: null,
      data,
      parsedType: getParsedType(data)
    };
    const maybeAsyncResult = this._parse({ data, path: ctx.path, parent: ctx });
    const result = await (isAsync(maybeAsyncResult) ? maybeAsyncResult : Promise.resolve(maybeAsyncResult));
    return handleResult(ctx, result);
  }
  refine(check, message) {
    const getIssueProperties = (val) => {
      if (typeof message === "string" || typeof message === "undefined") {
        return { message };
      } else if (typeof message === "function") {
        return message(val);
      } else {
        return message;
      }
    };
    return this._refinement((val, ctx) => {
      const result = check(val);
      const setError = () => ctx.addIssue({
        code: ZodIssueCode.custom,
        ...getIssueProperties(val)
      });
      if (typeof Promise !== "undefined" && result instanceof Promise) {
        return result.then((data) => {
          if (!data) {
            setError();
            return false;
          } else {
            return true;
          }
        });
      }
      if (!result) {
        setError();
        return false;
      } else {
        return true;
      }
    });
  }
  refinement(check, refinementData) {
    return this._refinement((val, ctx) => {
      if (!check(val)) {
        ctx.addIssue(typeof refinementData === "function" ? refinementData(val, ctx) : refinementData);
        return false;
      } else {
        return true;
      }
    });
  }
  _refinement(refinement) {
    return new ZodEffects({
      schema: this,
      typeName: ZodFirstPartyTypeKind.ZodEffects,
      effect: { type: "refinement", refinement }
    });
  }
  superRefine(refinement) {
    return this._refinement(refinement);
  }
  constructor(def) {
    this.spa = this.safeParseAsync;
    this._def = def;
    this.parse = this.parse.bind(this);
    this.safeParse = this.safeParse.bind(this);
    this.parseAsync = this.parseAsync.bind(this);
    this.safeParseAsync = this.safeParseAsync.bind(this);
    this.spa = this.spa.bind(this);
    this.refine = this.refine.bind(this);
    this.refinement = this.refinement.bind(this);
    this.superRefine = this.superRefine.bind(this);
    this.optional = this.optional.bind(this);
    this.nullable = this.nullable.bind(this);
    this.nullish = this.nullish.bind(this);
    this.array = this.array.bind(this);
    this.promise = this.promise.bind(this);
    this.or = this.or.bind(this);
    this.and = this.and.bind(this);
    this.transform = this.transform.bind(this);
    this.brand = this.brand.bind(this);
    this.default = this.default.bind(this);
    this.catch = this.catch.bind(this);
    this.describe = this.describe.bind(this);
    this.pipe = this.pipe.bind(this);
    this.readonly = this.readonly.bind(this);
    this.isNullable = this.isNullable.bind(this);
    this.isOptional = this.isOptional.bind(this);
    this["~standard"] = {
      version: 1,
      vendor: "zod",
      validate: (data) => this["~validate"](data)
    };
  }
  optional() {
    return ZodOptional.create(this, this._def);
  }
  nullable() {
    return ZodNullable.create(this, this._def);
  }
  nullish() {
    return this.nullable().optional();
  }
  array() {
    return ZodArray.create(this);
  }
  promise() {
    return ZodPromise.create(this, this._def);
  }
  or(option) {
    return ZodUnion.create([this, option], this._def);
  }
  and(incoming) {
    return ZodIntersection.create(this, incoming, this._def);
  }
  transform(transform) {
    return new ZodEffects({
      ...processCreateParams(this._def),
      schema: this,
      typeName: ZodFirstPartyTypeKind.ZodEffects,
      effect: { type: "transform", transform }
    });
  }
  default(def) {
    const defaultValueFunc = typeof def === "function" ? def : () => def;
    return new ZodDefault({
      ...processCreateParams(this._def),
      innerType: this,
      defaultValue: defaultValueFunc,
      typeName: ZodFirstPartyTypeKind.ZodDefault
    });
  }
  brand() {
    return new ZodBranded({
      typeName: ZodFirstPartyTypeKind.ZodBranded,
      type: this,
      ...processCreateParams(this._def)
    });
  }
  catch(def) {
    const catchValueFunc = typeof def === "function" ? def : () => def;
    return new ZodCatch({
      ...processCreateParams(this._def),
      innerType: this,
      catchValue: catchValueFunc,
      typeName: ZodFirstPartyTypeKind.ZodCatch
    });
  }
  describe(description) {
    const This = this.constructor;
    return new This({
      ...this._def,
      description
    });
  }
  pipe(target) {
    return ZodPipeline.create(this, target);
  }
  readonly() {
    return ZodReadonly.create(this);
  }
  isOptional() {
    return this.safeParse(void 0).success;
  }
  isNullable() {
    return this.safeParse(null).success;
  }
};
var cuidRegex = /^c[^\s-]{8,}$/i;
var cuid2Regex = /^[0-9a-z]+$/;
var ulidRegex = /^[0-9A-HJKMNP-TV-Z]{26}$/i;
var uuidRegex = /^[0-9a-fA-F]{8}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{12}$/i;
var nanoidRegex = /^[a-z0-9_-]{21}$/i;
var jwtRegex = /^[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]*$/;
var durationRegex = /^[-+]?P(?!$)(?:(?:[-+]?\d+Y)|(?:[-+]?\d+[.,]\d+Y$))?(?:(?:[-+]?\d+M)|(?:[-+]?\d+[.,]\d+M$))?(?:(?:[-+]?\d+W)|(?:[-+]?\d+[.,]\d+W$))?(?:(?:[-+]?\d+D)|(?:[-+]?\d+[.,]\d+D$))?(?:T(?=[\d+-])(?:(?:[-+]?\d+H)|(?:[-+]?\d+[.,]\d+H$))?(?:(?:[-+]?\d+M)|(?:[-+]?\d+[.,]\d+M$))?(?:[-+]?\d+(?:[.,]\d+)?S)?)??$/;
var emailRegex = /^(?!\.)(?!.*\.\.)([A-Z0-9_'+\-\.]*)[A-Z0-9_+-]@([A-Z0-9][A-Z0-9\-]*\.)+[A-Z]{2,}$/i;
var _emojiRegex = `^(\\p{Extended_Pictographic}|\\p{Emoji_Component})+$`;
var emojiRegex;
var ipv4Regex = /^(?:(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])\.){3}(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])$/;
var ipv4CidrRegex = /^(?:(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])\.){3}(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])\/(3[0-2]|[12]?[0-9])$/;
var ipv6Regex = /^(([0-9a-fA-F]{1,4}:){7,7}[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,7}:|([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}|([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3}|([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}|([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:((:[0-9a-fA-F]{1,4}){1,6})|:((:[0-9a-fA-F]{1,4}){1,7}|:)|fe80:(:[0-9a-fA-F]{0,4}){0,4}%[0-9a-zA-Z]{1,}|::(ffff(:0{1,4}){0,1}:){0,1}((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])|([0-9a-fA-F]{1,4}:){1,4}:((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9]))$/;
var ipv6CidrRegex = /^(([0-9a-fA-F]{1,4}:){7,7}[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,7}:|([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}|([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3}|([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}|([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:((:[0-9a-fA-F]{1,4}){1,6})|:((:[0-9a-fA-F]{1,4}){1,7}|:)|fe80:(:[0-9a-fA-F]{0,4}){0,4}%[0-9a-zA-Z]{1,}|::(ffff(:0{1,4}){0,1}:){0,1}((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])|([0-9a-fA-F]{1,4}:){1,4}:((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9]))\/(12[0-8]|1[01][0-9]|[1-9]?[0-9])$/;
var base64Regex = /^([0-9a-zA-Z+/]{4})*(([0-9a-zA-Z+/]{2}==)|([0-9a-zA-Z+/]{3}=))?$/;
var base64urlRegex = /^([0-9a-zA-Z-_]{4})*(([0-9a-zA-Z-_]{2}(==)?)|([0-9a-zA-Z-_]{3}(=)?))?$/;
var dateRegexSource = `((\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-((0[13578]|1[02])-(0[1-9]|[12]\\d|3[01])|(0[469]|11)-(0[1-9]|[12]\\d|30)|(02)-(0[1-9]|1\\d|2[0-8])))`;
var dateRegex = new RegExp(`^${dateRegexSource}$`);
function timeRegexSource(args) {
  let regex = `([01]\\d|2[0-3]):[0-5]\\d:[0-5]\\d`;
  if (args.precision) {
    regex = `${regex}\\.\\d{${args.precision}}`;
  } else if (args.precision == null) {
    regex = `${regex}(\\.\\d+)?`;
  }
  return regex;
}
function timeRegex(args) {
  return new RegExp(`^${timeRegexSource(args)}$`);
}
function datetimeRegex(args) {
  let regex = `${dateRegexSource}T${timeRegexSource(args)}`;
  const opts = [];
  opts.push(args.local ? `Z?` : `Z`);
  if (args.offset)
    opts.push(`([+-]\\d{2}:?\\d{2})`);
  regex = `${regex}(${opts.join("|")})`;
  return new RegExp(`^${regex}$`);
}
function isValidIP(ip, version) {
  if ((version === "v4" || !version) && ipv4Regex.test(ip)) {
    return true;
  }
  if ((version === "v6" || !version) && ipv6Regex.test(ip)) {
    return true;
  }
  return false;
}
function isValidJWT(jwt, alg) {
  if (!jwtRegex.test(jwt))
    return false;
  try {
    const [header] = jwt.split(".");
    const base64 = header.replace(/-/g, "+").replace(/_/g, "/").padEnd(header.length + (4 - header.length % 4) % 4, "=");
    const decoded = JSON.parse(atob(base64));
    if (typeof decoded !== "object" || decoded === null)
      return false;
    if (!decoded.typ || !decoded.alg)
      return false;
    if (alg && decoded.alg !== alg)
      return false;
    return true;
  } catch (_a) {
    return false;
  }
}
function isValidCidr(ip, version) {
  if ((version === "v4" || !version) && ipv4CidrRegex.test(ip)) {
    return true;
  }
  if ((version === "v6" || !version) && ipv6CidrRegex.test(ip)) {
    return true;
  }
  return false;
}
var ZodString = class _ZodString extends ZodType {
  _parse(input) {
    if (this._def.coerce) {
      input.data = String(input.data);
    }
    const parsedType = this._getType(input);
    if (parsedType !== ZodParsedType.string) {
      const ctx2 = this._getOrReturnCtx(input);
      addIssueToContext(ctx2, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.string,
        received: ctx2.parsedType
      });
      return INVALID;
    }
    const status = new ParseStatus();
    let ctx = void 0;
    for (const check of this._def.checks) {
      if (check.kind === "min") {
        if (input.data.length < check.value) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.too_small,
            minimum: check.value,
            type: "string",
            inclusive: true,
            exact: false,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "max") {
        if (input.data.length > check.value) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.too_big,
            maximum: check.value,
            type: "string",
            inclusive: true,
            exact: false,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "length") {
        const tooBig = input.data.length > check.value;
        const tooSmall = input.data.length < check.value;
        if (tooBig || tooSmall) {
          ctx = this._getOrReturnCtx(input, ctx);
          if (tooBig) {
            addIssueToContext(ctx, {
              code: ZodIssueCode.too_big,
              maximum: check.value,
              type: "string",
              inclusive: true,
              exact: true,
              message: check.message
            });
          } else if (tooSmall) {
            addIssueToContext(ctx, {
              code: ZodIssueCode.too_small,
              minimum: check.value,
              type: "string",
              inclusive: true,
              exact: true,
              message: check.message
            });
          }
          status.dirty();
        }
      } else if (check.kind === "email") {
        if (!emailRegex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "email",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "emoji") {
        if (!emojiRegex) {
          emojiRegex = new RegExp(_emojiRegex, "u");
        }
        if (!emojiRegex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "emoji",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "uuid") {
        if (!uuidRegex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "uuid",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "nanoid") {
        if (!nanoidRegex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "nanoid",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "cuid") {
        if (!cuidRegex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "cuid",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "cuid2") {
        if (!cuid2Regex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "cuid2",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "ulid") {
        if (!ulidRegex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "ulid",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "url") {
        try {
          new URL(input.data);
        } catch (_a) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "url",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "regex") {
        check.regex.lastIndex = 0;
        const testResult = check.regex.test(input.data);
        if (!testResult) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "regex",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "trim") {
        input.data = input.data.trim();
      } else if (check.kind === "includes") {
        if (!input.data.includes(check.value, check.position)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.invalid_string,
            validation: { includes: check.value, position: check.position },
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "toLowerCase") {
        input.data = input.data.toLowerCase();
      } else if (check.kind === "toUpperCase") {
        input.data = input.data.toUpperCase();
      } else if (check.kind === "startsWith") {
        if (!input.data.startsWith(check.value)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.invalid_string,
            validation: { startsWith: check.value },
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "endsWith") {
        if (!input.data.endsWith(check.value)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.invalid_string,
            validation: { endsWith: check.value },
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "datetime") {
        const regex = datetimeRegex(check);
        if (!regex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.invalid_string,
            validation: "datetime",
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "date") {
        const regex = dateRegex;
        if (!regex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.invalid_string,
            validation: "date",
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "time") {
        const regex = timeRegex(check);
        if (!regex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.invalid_string,
            validation: "time",
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "duration") {
        if (!durationRegex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "duration",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "ip") {
        if (!isValidIP(input.data, check.version)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "ip",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "jwt") {
        if (!isValidJWT(input.data, check.alg)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "jwt",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "cidr") {
        if (!isValidCidr(input.data, check.version)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "cidr",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "base64") {
        if (!base64Regex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "base64",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "base64url") {
        if (!base64urlRegex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "base64url",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else {
        util.assertNever(check);
      }
    }
    return { status: status.value, value: input.data };
  }
  _regex(regex, validation, message) {
    return this.refinement((data) => regex.test(data), {
      validation,
      code: ZodIssueCode.invalid_string,
      ...errorUtil.errToObj(message)
    });
  }
  _addCheck(check) {
    return new _ZodString({
      ...this._def,
      checks: [...this._def.checks, check]
    });
  }
  email(message) {
    return this._addCheck({ kind: "email", ...errorUtil.errToObj(message) });
  }
  url(message) {
    return this._addCheck({ kind: "url", ...errorUtil.errToObj(message) });
  }
  emoji(message) {
    return this._addCheck({ kind: "emoji", ...errorUtil.errToObj(message) });
  }
  uuid(message) {
    return this._addCheck({ kind: "uuid", ...errorUtil.errToObj(message) });
  }
  nanoid(message) {
    return this._addCheck({ kind: "nanoid", ...errorUtil.errToObj(message) });
  }
  cuid(message) {
    return this._addCheck({ kind: "cuid", ...errorUtil.errToObj(message) });
  }
  cuid2(message) {
    return this._addCheck({ kind: "cuid2", ...errorUtil.errToObj(message) });
  }
  ulid(message) {
    return this._addCheck({ kind: "ulid", ...errorUtil.errToObj(message) });
  }
  base64(message) {
    return this._addCheck({ kind: "base64", ...errorUtil.errToObj(message) });
  }
  base64url(message) {
    return this._addCheck({
      kind: "base64url",
      ...errorUtil.errToObj(message)
    });
  }
  jwt(options) {
    return this._addCheck({ kind: "jwt", ...errorUtil.errToObj(options) });
  }
  ip(options) {
    return this._addCheck({ kind: "ip", ...errorUtil.errToObj(options) });
  }
  cidr(options) {
    return this._addCheck({ kind: "cidr", ...errorUtil.errToObj(options) });
  }
  datetime(options) {
    var _a, _b;
    if (typeof options === "string") {
      return this._addCheck({
        kind: "datetime",
        precision: null,
        offset: false,
        local: false,
        message: options
      });
    }
    return this._addCheck({
      kind: "datetime",
      precision: typeof (options === null || options === void 0 ? void 0 : options.precision) === "undefined" ? null : options === null || options === void 0 ? void 0 : options.precision,
      offset: (_a = options === null || options === void 0 ? void 0 : options.offset) !== null && _a !== void 0 ? _a : false,
      local: (_b = options === null || options === void 0 ? void 0 : options.local) !== null && _b !== void 0 ? _b : false,
      ...errorUtil.errToObj(options === null || options === void 0 ? void 0 : options.message)
    });
  }
  date(message) {
    return this._addCheck({ kind: "date", message });
  }
  time(options) {
    if (typeof options === "string") {
      return this._addCheck({
        kind: "time",
        precision: null,
        message: options
      });
    }
    return this._addCheck({
      kind: "time",
      precision: typeof (options === null || options === void 0 ? void 0 : options.precision) === "undefined" ? null : options === null || options === void 0 ? void 0 : options.precision,
      ...errorUtil.errToObj(options === null || options === void 0 ? void 0 : options.message)
    });
  }
  duration(message) {
    return this._addCheck({ kind: "duration", ...errorUtil.errToObj(message) });
  }
  regex(regex, message) {
    return this._addCheck({
      kind: "regex",
      regex,
      ...errorUtil.errToObj(message)
    });
  }
  includes(value, options) {
    return this._addCheck({
      kind: "includes",
      value,
      position: options === null || options === void 0 ? void 0 : options.position,
      ...errorUtil.errToObj(options === null || options === void 0 ? void 0 : options.message)
    });
  }
  startsWith(value, message) {
    return this._addCheck({
      kind: "startsWith",
      value,
      ...errorUtil.errToObj(message)
    });
  }
  endsWith(value, message) {
    return this._addCheck({
      kind: "endsWith",
      value,
      ...errorUtil.errToObj(message)
    });
  }
  min(minLength, message) {
    return this._addCheck({
      kind: "min",
      value: minLength,
      ...errorUtil.errToObj(message)
    });
  }
  max(maxLength, message) {
    return this._addCheck({
      kind: "max",
      value: maxLength,
      ...errorUtil.errToObj(message)
    });
  }
  length(len, message) {
    return this._addCheck({
      kind: "length",
      value: len,
      ...errorUtil.errToObj(message)
    });
  }
  /**
   * Equivalent to `.min(1)`
   */
  nonempty(message) {
    return this.min(1, errorUtil.errToObj(message));
  }
  trim() {
    return new _ZodString({
      ...this._def,
      checks: [...this._def.checks, { kind: "trim" }]
    });
  }
  toLowerCase() {
    return new _ZodString({
      ...this._def,
      checks: [...this._def.checks, { kind: "toLowerCase" }]
    });
  }
  toUpperCase() {
    return new _ZodString({
      ...this._def,
      checks: [...this._def.checks, { kind: "toUpperCase" }]
    });
  }
  get isDatetime() {
    return !!this._def.checks.find((ch) => ch.kind === "datetime");
  }
  get isDate() {
    return !!this._def.checks.find((ch) => ch.kind === "date");
  }
  get isTime() {
    return !!this._def.checks.find((ch) => ch.kind === "time");
  }
  get isDuration() {
    return !!this._def.checks.find((ch) => ch.kind === "duration");
  }
  get isEmail() {
    return !!this._def.checks.find((ch) => ch.kind === "email");
  }
  get isURL() {
    return !!this._def.checks.find((ch) => ch.kind === "url");
  }
  get isEmoji() {
    return !!this._def.checks.find((ch) => ch.kind === "emoji");
  }
  get isUUID() {
    return !!this._def.checks.find((ch) => ch.kind === "uuid");
  }
  get isNANOID() {
    return !!this._def.checks.find((ch) => ch.kind === "nanoid");
  }
  get isCUID() {
    return !!this._def.checks.find((ch) => ch.kind === "cuid");
  }
  get isCUID2() {
    return !!this._def.checks.find((ch) => ch.kind === "cuid2");
  }
  get isULID() {
    return !!this._def.checks.find((ch) => ch.kind === "ulid");
  }
  get isIP() {
    return !!this._def.checks.find((ch) => ch.kind === "ip");
  }
  get isCIDR() {
    return !!this._def.checks.find((ch) => ch.kind === "cidr");
  }
  get isBase64() {
    return !!this._def.checks.find((ch) => ch.kind === "base64");
  }
  get isBase64url() {
    return !!this._def.checks.find((ch) => ch.kind === "base64url");
  }
  get minLength() {
    let min = null;
    for (const ch of this._def.checks) {
      if (ch.kind === "min") {
        if (min === null || ch.value > min)
          min = ch.value;
      }
    }
    return min;
  }
  get maxLength() {
    let max = null;
    for (const ch of this._def.checks) {
      if (ch.kind === "max") {
        if (max === null || ch.value < max)
          max = ch.value;
      }
    }
    return max;
  }
};
ZodString.create = (params) => {
  var _a;
  return new ZodString({
    checks: [],
    typeName: ZodFirstPartyTypeKind.ZodString,
    coerce: (_a = params === null || params === void 0 ? void 0 : params.coerce) !== null && _a !== void 0 ? _a : false,
    ...processCreateParams(params)
  });
};
function floatSafeRemainder(val, step) {
  const valDecCount = (val.toString().split(".")[1] || "").length;
  const stepDecCount = (step.toString().split(".")[1] || "").length;
  const decCount = valDecCount > stepDecCount ? valDecCount : stepDecCount;
  const valInt = parseInt(val.toFixed(decCount).replace(".", ""));
  const stepInt = parseInt(step.toFixed(decCount).replace(".", ""));
  return valInt % stepInt / Math.pow(10, decCount);
}
var ZodNumber = class _ZodNumber extends ZodType {
  constructor() {
    super(...arguments);
    this.min = this.gte;
    this.max = this.lte;
    this.step = this.multipleOf;
  }
  _parse(input) {
    if (this._def.coerce) {
      input.data = Number(input.data);
    }
    const parsedType = this._getType(input);
    if (parsedType !== ZodParsedType.number) {
      const ctx2 = this._getOrReturnCtx(input);
      addIssueToContext(ctx2, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.number,
        received: ctx2.parsedType
      });
      return INVALID;
    }
    let ctx = void 0;
    const status = new ParseStatus();
    for (const check of this._def.checks) {
      if (check.kind === "int") {
        if (!util.isInteger(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.invalid_type,
            expected: "integer",
            received: "float",
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "min") {
        const tooSmall = check.inclusive ? input.data < check.value : input.data <= check.value;
        if (tooSmall) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.too_small,
            minimum: check.value,
            type: "number",
            inclusive: check.inclusive,
            exact: false,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "max") {
        const tooBig = check.inclusive ? input.data > check.value : input.data >= check.value;
        if (tooBig) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.too_big,
            maximum: check.value,
            type: "number",
            inclusive: check.inclusive,
            exact: false,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "multipleOf") {
        if (floatSafeRemainder(input.data, check.value) !== 0) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.not_multiple_of,
            multipleOf: check.value,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "finite") {
        if (!Number.isFinite(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.not_finite,
            message: check.message
          });
          status.dirty();
        }
      } else {
        util.assertNever(check);
      }
    }
    return { status: status.value, value: input.data };
  }
  gte(value, message) {
    return this.setLimit("min", value, true, errorUtil.toString(message));
  }
  gt(value, message) {
    return this.setLimit("min", value, false, errorUtil.toString(message));
  }
  lte(value, message) {
    return this.setLimit("max", value, true, errorUtil.toString(message));
  }
  lt(value, message) {
    return this.setLimit("max", value, false, errorUtil.toString(message));
  }
  setLimit(kind, value, inclusive, message) {
    return new _ZodNumber({
      ...this._def,
      checks: [
        ...this._def.checks,
        {
          kind,
          value,
          inclusive,
          message: errorUtil.toString(message)
        }
      ]
    });
  }
  _addCheck(check) {
    return new _ZodNumber({
      ...this._def,
      checks: [...this._def.checks, check]
    });
  }
  int(message) {
    return this._addCheck({
      kind: "int",
      message: errorUtil.toString(message)
    });
  }
  positive(message) {
    return this._addCheck({
      kind: "min",
      value: 0,
      inclusive: false,
      message: errorUtil.toString(message)
    });
  }
  negative(message) {
    return this._addCheck({
      kind: "max",
      value: 0,
      inclusive: false,
      message: errorUtil.toString(message)
    });
  }
  nonpositive(message) {
    return this._addCheck({
      kind: "max",
      value: 0,
      inclusive: true,
      message: errorUtil.toString(message)
    });
  }
  nonnegative(message) {
    return this._addCheck({
      kind: "min",
      value: 0,
      inclusive: true,
      message: errorUtil.toString(message)
    });
  }
  multipleOf(value, message) {
    return this._addCheck({
      kind: "multipleOf",
      value,
      message: errorUtil.toString(message)
    });
  }
  finite(message) {
    return this._addCheck({
      kind: "finite",
      message: errorUtil.toString(message)
    });
  }
  safe(message) {
    return this._addCheck({
      kind: "min",
      inclusive: true,
      value: Number.MIN_SAFE_INTEGER,
      message: errorUtil.toString(message)
    })._addCheck({
      kind: "max",
      inclusive: true,
      value: Number.MAX_SAFE_INTEGER,
      message: errorUtil.toString(message)
    });
  }
  get minValue() {
    let min = null;
    for (const ch of this._def.checks) {
      if (ch.kind === "min") {
        if (min === null || ch.value > min)
          min = ch.value;
      }
    }
    return min;
  }
  get maxValue() {
    let max = null;
    for (const ch of this._def.checks) {
      if (ch.kind === "max") {
        if (max === null || ch.value < max)
          max = ch.value;
      }
    }
    return max;
  }
  get isInt() {
    return !!this._def.checks.find((ch) => ch.kind === "int" || ch.kind === "multipleOf" && util.isInteger(ch.value));
  }
  get isFinite() {
    let max = null, min = null;
    for (const ch of this._def.checks) {
      if (ch.kind === "finite" || ch.kind === "int" || ch.kind === "multipleOf") {
        return true;
      } else if (ch.kind === "min") {
        if (min === null || ch.value > min)
          min = ch.value;
      } else if (ch.kind === "max") {
        if (max === null || ch.value < max)
          max = ch.value;
      }
    }
    return Number.isFinite(min) && Number.isFinite(max);
  }
};
ZodNumber.create = (params) => {
  return new ZodNumber({
    checks: [],
    typeName: ZodFirstPartyTypeKind.ZodNumber,
    coerce: (params === null || params === void 0 ? void 0 : params.coerce) || false,
    ...processCreateParams(params)
  });
};
var ZodBigInt = class _ZodBigInt extends ZodType {
  constructor() {
    super(...arguments);
    this.min = this.gte;
    this.max = this.lte;
  }
  _parse(input) {
    if (this._def.coerce) {
      try {
        input.data = BigInt(input.data);
      } catch (_a) {
        return this._getInvalidInput(input);
      }
    }
    const parsedType = this._getType(input);
    if (parsedType !== ZodParsedType.bigint) {
      return this._getInvalidInput(input);
    }
    let ctx = void 0;
    const status = new ParseStatus();
    for (const check of this._def.checks) {
      if (check.kind === "min") {
        const tooSmall = check.inclusive ? input.data < check.value : input.data <= check.value;
        if (tooSmall) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.too_small,
            type: "bigint",
            minimum: check.value,
            inclusive: check.inclusive,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "max") {
        const tooBig = check.inclusive ? input.data > check.value : input.data >= check.value;
        if (tooBig) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.too_big,
            type: "bigint",
            maximum: check.value,
            inclusive: check.inclusive,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "multipleOf") {
        if (input.data % check.value !== BigInt(0)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.not_multiple_of,
            multipleOf: check.value,
            message: check.message
          });
          status.dirty();
        }
      } else {
        util.assertNever(check);
      }
    }
    return { status: status.value, value: input.data };
  }
  _getInvalidInput(input) {
    const ctx = this._getOrReturnCtx(input);
    addIssueToContext(ctx, {
      code: ZodIssueCode.invalid_type,
      expected: ZodParsedType.bigint,
      received: ctx.parsedType
    });
    return INVALID;
  }
  gte(value, message) {
    return this.setLimit("min", value, true, errorUtil.toString(message));
  }
  gt(value, message) {
    return this.setLimit("min", value, false, errorUtil.toString(message));
  }
  lte(value, message) {
    return this.setLimit("max", value, true, errorUtil.toString(message));
  }
  lt(value, message) {
    return this.setLimit("max", value, false, errorUtil.toString(message));
  }
  setLimit(kind, value, inclusive, message) {
    return new _ZodBigInt({
      ...this._def,
      checks: [
        ...this._def.checks,
        {
          kind,
          value,
          inclusive,
          message: errorUtil.toString(message)
        }
      ]
    });
  }
  _addCheck(check) {
    return new _ZodBigInt({
      ...this._def,
      checks: [...this._def.checks, check]
    });
  }
  positive(message) {
    return this._addCheck({
      kind: "min",
      value: BigInt(0),
      inclusive: false,
      message: errorUtil.toString(message)
    });
  }
  negative(message) {
    return this._addCheck({
      kind: "max",
      value: BigInt(0),
      inclusive: false,
      message: errorUtil.toString(message)
    });
  }
  nonpositive(message) {
    return this._addCheck({
      kind: "max",
      value: BigInt(0),
      inclusive: true,
      message: errorUtil.toString(message)
    });
  }
  nonnegative(message) {
    return this._addCheck({
      kind: "min",
      value: BigInt(0),
      inclusive: true,
      message: errorUtil.toString(message)
    });
  }
  multipleOf(value, message) {
    return this._addCheck({
      kind: "multipleOf",
      value,
      message: errorUtil.toString(message)
    });
  }
  get minValue() {
    let min = null;
    for (const ch of this._def.checks) {
      if (ch.kind === "min") {
        if (min === null || ch.value > min)
          min = ch.value;
      }
    }
    return min;
  }
  get maxValue() {
    let max = null;
    for (const ch of this._def.checks) {
      if (ch.kind === "max") {
        if (max === null || ch.value < max)
          max = ch.value;
      }
    }
    return max;
  }
};
ZodBigInt.create = (params) => {
  var _a;
  return new ZodBigInt({
    checks: [],
    typeName: ZodFirstPartyTypeKind.ZodBigInt,
    coerce: (_a = params === null || params === void 0 ? void 0 : params.coerce) !== null && _a !== void 0 ? _a : false,
    ...processCreateParams(params)
  });
};
var ZodBoolean = class extends ZodType {
  _parse(input) {
    if (this._def.coerce) {
      input.data = Boolean(input.data);
    }
    const parsedType = this._getType(input);
    if (parsedType !== ZodParsedType.boolean) {
      const ctx = this._getOrReturnCtx(input);
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.boolean,
        received: ctx.parsedType
      });
      return INVALID;
    }
    return OK(input.data);
  }
};
ZodBoolean.create = (params) => {
  return new ZodBoolean({
    typeName: ZodFirstPartyTypeKind.ZodBoolean,
    coerce: (params === null || params === void 0 ? void 0 : params.coerce) || false,
    ...processCreateParams(params)
  });
};
var ZodDate = class _ZodDate extends ZodType {
  _parse(input) {
    if (this._def.coerce) {
      input.data = new Date(input.data);
    }
    const parsedType = this._getType(input);
    if (parsedType !== ZodParsedType.date) {
      const ctx2 = this._getOrReturnCtx(input);
      addIssueToContext(ctx2, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.date,
        received: ctx2.parsedType
      });
      return INVALID;
    }
    if (isNaN(input.data.getTime())) {
      const ctx2 = this._getOrReturnCtx(input);
      addIssueToContext(ctx2, {
        code: ZodIssueCode.invalid_date
      });
      return INVALID;
    }
    const status = new ParseStatus();
    let ctx = void 0;
    for (const check of this._def.checks) {
      if (check.kind === "min") {
        if (input.data.getTime() < check.value) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.too_small,
            message: check.message,
            inclusive: true,
            exact: false,
            minimum: check.value,
            type: "date"
          });
          status.dirty();
        }
      } else if (check.kind === "max") {
        if (input.data.getTime() > check.value) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.too_big,
            message: check.message,
            inclusive: true,
            exact: false,
            maximum: check.value,
            type: "date"
          });
          status.dirty();
        }
      } else {
        util.assertNever(check);
      }
    }
    return {
      status: status.value,
      value: new Date(input.data.getTime())
    };
  }
  _addCheck(check) {
    return new _ZodDate({
      ...this._def,
      checks: [...this._def.checks, check]
    });
  }
  min(minDate, message) {
    return this._addCheck({
      kind: "min",
      value: minDate.getTime(),
      message: errorUtil.toString(message)
    });
  }
  max(maxDate, message) {
    return this._addCheck({
      kind: "max",
      value: maxDate.getTime(),
      message: errorUtil.toString(message)
    });
  }
  get minDate() {
    let min = null;
    for (const ch of this._def.checks) {
      if (ch.kind === "min") {
        if (min === null || ch.value > min)
          min = ch.value;
      }
    }
    return min != null ? new Date(min) : null;
  }
  get maxDate() {
    let max = null;
    for (const ch of this._def.checks) {
      if (ch.kind === "max") {
        if (max === null || ch.value < max)
          max = ch.value;
      }
    }
    return max != null ? new Date(max) : null;
  }
};
ZodDate.create = (params) => {
  return new ZodDate({
    checks: [],
    coerce: (params === null || params === void 0 ? void 0 : params.coerce) || false,
    typeName: ZodFirstPartyTypeKind.ZodDate,
    ...processCreateParams(params)
  });
};
var ZodSymbol = class extends ZodType {
  _parse(input) {
    const parsedType = this._getType(input);
    if (parsedType !== ZodParsedType.symbol) {
      const ctx = this._getOrReturnCtx(input);
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.symbol,
        received: ctx.parsedType
      });
      return INVALID;
    }
    return OK(input.data);
  }
};
ZodSymbol.create = (params) => {
  return new ZodSymbol({
    typeName: ZodFirstPartyTypeKind.ZodSymbol,
    ...processCreateParams(params)
  });
};
var ZodUndefined = class extends ZodType {
  _parse(input) {
    const parsedType = this._getType(input);
    if (parsedType !== ZodParsedType.undefined) {
      const ctx = this._getOrReturnCtx(input);
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.undefined,
        received: ctx.parsedType
      });
      return INVALID;
    }
    return OK(input.data);
  }
};
ZodUndefined.create = (params) => {
  return new ZodUndefined({
    typeName: ZodFirstPartyTypeKind.ZodUndefined,
    ...processCreateParams(params)
  });
};
var ZodNull = class extends ZodType {
  _parse(input) {
    const parsedType = this._getType(input);
    if (parsedType !== ZodParsedType.null) {
      const ctx = this._getOrReturnCtx(input);
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.null,
        received: ctx.parsedType
      });
      return INVALID;
    }
    return OK(input.data);
  }
};
ZodNull.create = (params) => {
  return new ZodNull({
    typeName: ZodFirstPartyTypeKind.ZodNull,
    ...processCreateParams(params)
  });
};
var ZodAny = class extends ZodType {
  constructor() {
    super(...arguments);
    this._any = true;
  }
  _parse(input) {
    return OK(input.data);
  }
};
ZodAny.create = (params) => {
  return new ZodAny({
    typeName: ZodFirstPartyTypeKind.ZodAny,
    ...processCreateParams(params)
  });
};
var ZodUnknown = class extends ZodType {
  constructor() {
    super(...arguments);
    this._unknown = true;
  }
  _parse(input) {
    return OK(input.data);
  }
};
ZodUnknown.create = (params) => {
  return new ZodUnknown({
    typeName: ZodFirstPartyTypeKind.ZodUnknown,
    ...processCreateParams(params)
  });
};
var ZodNever = class extends ZodType {
  _parse(input) {
    const ctx = this._getOrReturnCtx(input);
    addIssueToContext(ctx, {
      code: ZodIssueCode.invalid_type,
      expected: ZodParsedType.never,
      received: ctx.parsedType
    });
    return INVALID;
  }
};
ZodNever.create = (params) => {
  return new ZodNever({
    typeName: ZodFirstPartyTypeKind.ZodNever,
    ...processCreateParams(params)
  });
};
var ZodVoid = class extends ZodType {
  _parse(input) {
    const parsedType = this._getType(input);
    if (parsedType !== ZodParsedType.undefined) {
      const ctx = this._getOrReturnCtx(input);
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.void,
        received: ctx.parsedType
      });
      return INVALID;
    }
    return OK(input.data);
  }
};
ZodVoid.create = (params) => {
  return new ZodVoid({
    typeName: ZodFirstPartyTypeKind.ZodVoid,
    ...processCreateParams(params)
  });
};
var ZodArray = class _ZodArray extends ZodType {
  _parse(input) {
    const { ctx, status } = this._processInputParams(input);
    const def = this._def;
    if (ctx.parsedType !== ZodParsedType.array) {
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.array,
        received: ctx.parsedType
      });
      return INVALID;
    }
    if (def.exactLength !== null) {
      const tooBig = ctx.data.length > def.exactLength.value;
      const tooSmall = ctx.data.length < def.exactLength.value;
      if (tooBig || tooSmall) {
        addIssueToContext(ctx, {
          code: tooBig ? ZodIssueCode.too_big : ZodIssueCode.too_small,
          minimum: tooSmall ? def.exactLength.value : void 0,
          maximum: tooBig ? def.exactLength.value : void 0,
          type: "array",
          inclusive: true,
          exact: true,
          message: def.exactLength.message
        });
        status.dirty();
      }
    }
    if (def.minLength !== null) {
      if (ctx.data.length < def.minLength.value) {
        addIssueToContext(ctx, {
          code: ZodIssueCode.too_small,
          minimum: def.minLength.value,
          type: "array",
          inclusive: true,
          exact: false,
          message: def.minLength.message
        });
        status.dirty();
      }
    }
    if (def.maxLength !== null) {
      if (ctx.data.length > def.maxLength.value) {
        addIssueToContext(ctx, {
          code: ZodIssueCode.too_big,
          maximum: def.maxLength.value,
          type: "array",
          inclusive: true,
          exact: false,
          message: def.maxLength.message
        });
        status.dirty();
      }
    }
    if (ctx.common.async) {
      return Promise.all([...ctx.data].map((item, i) => {
        return def.type._parseAsync(new ParseInputLazyPath(ctx, item, ctx.path, i));
      })).then((result2) => {
        return ParseStatus.mergeArray(status, result2);
      });
    }
    const result = [...ctx.data].map((item, i) => {
      return def.type._parseSync(new ParseInputLazyPath(ctx, item, ctx.path, i));
    });
    return ParseStatus.mergeArray(status, result);
  }
  get element() {
    return this._def.type;
  }
  min(minLength, message) {
    return new _ZodArray({
      ...this._def,
      minLength: { value: minLength, message: errorUtil.toString(message) }
    });
  }
  max(maxLength, message) {
    return new _ZodArray({
      ...this._def,
      maxLength: { value: maxLength, message: errorUtil.toString(message) }
    });
  }
  length(len, message) {
    return new _ZodArray({
      ...this._def,
      exactLength: { value: len, message: errorUtil.toString(message) }
    });
  }
  nonempty(message) {
    return this.min(1, message);
  }
};
ZodArray.create = (schema, params) => {
  return new ZodArray({
    type: schema,
    minLength: null,
    maxLength: null,
    exactLength: null,
    typeName: ZodFirstPartyTypeKind.ZodArray,
    ...processCreateParams(params)
  });
};
function deepPartialify(schema) {
  if (schema instanceof ZodObject) {
    const newShape = {};
    for (const key in schema.shape) {
      const fieldSchema = schema.shape[key];
      newShape[key] = ZodOptional.create(deepPartialify(fieldSchema));
    }
    return new ZodObject({
      ...schema._def,
      shape: () => newShape
    });
  } else if (schema instanceof ZodArray) {
    return new ZodArray({
      ...schema._def,
      type: deepPartialify(schema.element)
    });
  } else if (schema instanceof ZodOptional) {
    return ZodOptional.create(deepPartialify(schema.unwrap()));
  } else if (schema instanceof ZodNullable) {
    return ZodNullable.create(deepPartialify(schema.unwrap()));
  } else if (schema instanceof ZodTuple) {
    return ZodTuple.create(schema.items.map((item) => deepPartialify(item)));
  } else {
    return schema;
  }
}
var ZodObject = class _ZodObject extends ZodType {
  constructor() {
    super(...arguments);
    this._cached = null;
    this.nonstrict = this.passthrough;
    this.augment = this.extend;
  }
  _getCached() {
    if (this._cached !== null)
      return this._cached;
    const shape = this._def.shape();
    const keys = util.objectKeys(shape);
    return this._cached = { shape, keys };
  }
  _parse(input) {
    const parsedType = this._getType(input);
    if (parsedType !== ZodParsedType.object) {
      const ctx2 = this._getOrReturnCtx(input);
      addIssueToContext(ctx2, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.object,
        received: ctx2.parsedType
      });
      return INVALID;
    }
    const { status, ctx } = this._processInputParams(input);
    const { shape, keys: shapeKeys } = this._getCached();
    const extraKeys = [];
    if (!(this._def.catchall instanceof ZodNever && this._def.unknownKeys === "strip")) {
      for (const key in ctx.data) {
        if (!shapeKeys.includes(key)) {
          extraKeys.push(key);
        }
      }
    }
    const pairs = [];
    for (const key of shapeKeys) {
      const keyValidator = shape[key];
      const value = ctx.data[key];
      pairs.push({
        key: { status: "valid", value: key },
        value: keyValidator._parse(new ParseInputLazyPath(ctx, value, ctx.path, key)),
        alwaysSet: key in ctx.data
      });
    }
    if (this._def.catchall instanceof ZodNever) {
      const unknownKeys = this._def.unknownKeys;
      if (unknownKeys === "passthrough") {
        for (const key of extraKeys) {
          pairs.push({
            key: { status: "valid", value: key },
            value: { status: "valid", value: ctx.data[key] }
          });
        }
      } else if (unknownKeys === "strict") {
        if (extraKeys.length > 0) {
          addIssueToContext(ctx, {
            code: ZodIssueCode.unrecognized_keys,
            keys: extraKeys
          });
          status.dirty();
        }
      } else if (unknownKeys === "strip") ;
      else {
        throw new Error(`Internal ZodObject error: invalid unknownKeys value.`);
      }
    } else {
      const catchall = this._def.catchall;
      for (const key of extraKeys) {
        const value = ctx.data[key];
        pairs.push({
          key: { status: "valid", value: key },
          value: catchall._parse(
            new ParseInputLazyPath(ctx, value, ctx.path, key)
            //, ctx.child(key), value, getParsedType(value)
          ),
          alwaysSet: key in ctx.data
        });
      }
    }
    if (ctx.common.async) {
      return Promise.resolve().then(async () => {
        const syncPairs = [];
        for (const pair of pairs) {
          const key = await pair.key;
          const value = await pair.value;
          syncPairs.push({
            key,
            value,
            alwaysSet: pair.alwaysSet
          });
        }
        return syncPairs;
      }).then((syncPairs) => {
        return ParseStatus.mergeObjectSync(status, syncPairs);
      });
    } else {
      return ParseStatus.mergeObjectSync(status, pairs);
    }
  }
  get shape() {
    return this._def.shape();
  }
  strict(message) {
    errorUtil.errToObj;
    return new _ZodObject({
      ...this._def,
      unknownKeys: "strict",
      ...message !== void 0 ? {
        errorMap: (issue, ctx) => {
          var _a, _b, _c, _d;
          const defaultError = (_c = (_b = (_a = this._def).errorMap) === null || _b === void 0 ? void 0 : _b.call(_a, issue, ctx).message) !== null && _c !== void 0 ? _c : ctx.defaultError;
          if (issue.code === "unrecognized_keys")
            return {
              message: (_d = errorUtil.errToObj(message).message) !== null && _d !== void 0 ? _d : defaultError
            };
          return {
            message: defaultError
          };
        }
      } : {}
    });
  }
  strip() {
    return new _ZodObject({
      ...this._def,
      unknownKeys: "strip"
    });
  }
  passthrough() {
    return new _ZodObject({
      ...this._def,
      unknownKeys: "passthrough"
    });
  }
  // const AugmentFactory =
  //   <Def extends ZodObjectDef>(def: Def) =>
  //   <Augmentation extends ZodRawShape>(
  //     augmentation: Augmentation
  //   ): ZodObject<
  //     extendShape<ReturnType<Def["shape"]>, Augmentation>,
  //     Def["unknownKeys"],
  //     Def["catchall"]
  //   > => {
  //     return new ZodObject({
  //       ...def,
  //       shape: () => ({
  //         ...def.shape(),
  //         ...augmentation,
  //       }),
  //     }) as any;
  //   };
  extend(augmentation) {
    return new _ZodObject({
      ...this._def,
      shape: () => ({
        ...this._def.shape(),
        ...augmentation
      })
    });
  }
  /**
   * Prior to zod@1.0.12 there was a bug in the
   * inferred type of merged objects. Please
   * upgrade if you are experiencing issues.
   */
  merge(merging) {
    const merged = new _ZodObject({
      unknownKeys: merging._def.unknownKeys,
      catchall: merging._def.catchall,
      shape: () => ({
        ...this._def.shape(),
        ...merging._def.shape()
      }),
      typeName: ZodFirstPartyTypeKind.ZodObject
    });
    return merged;
  }
  // merge<
  //   Incoming extends AnyZodObject,
  //   Augmentation extends Incoming["shape"],
  //   NewOutput extends {
  //     [k in keyof Augmentation | keyof Output]: k extends keyof Augmentation
  //       ? Augmentation[k]["_output"]
  //       : k extends keyof Output
  //       ? Output[k]
  //       : never;
  //   },
  //   NewInput extends {
  //     [k in keyof Augmentation | keyof Input]: k extends keyof Augmentation
  //       ? Augmentation[k]["_input"]
  //       : k extends keyof Input
  //       ? Input[k]
  //       : never;
  //   }
  // >(
  //   merging: Incoming
  // ): ZodObject<
  //   extendShape<T, ReturnType<Incoming["_def"]["shape"]>>,
  //   Incoming["_def"]["unknownKeys"],
  //   Incoming["_def"]["catchall"],
  //   NewOutput,
  //   NewInput
  // > {
  //   const merged: any = new ZodObject({
  //     unknownKeys: merging._def.unknownKeys,
  //     catchall: merging._def.catchall,
  //     shape: () =>
  //       objectUtil.mergeShapes(this._def.shape(), merging._def.shape()),
  //     typeName: ZodFirstPartyTypeKind.ZodObject,
  //   }) as any;
  //   return merged;
  // }
  setKey(key, schema) {
    return this.augment({ [key]: schema });
  }
  // merge<Incoming extends AnyZodObject>(
  //   merging: Incoming
  // ): //ZodObject<T & Incoming["_shape"], UnknownKeys, Catchall> = (merging) => {
  // ZodObject<
  //   extendShape<T, ReturnType<Incoming["_def"]["shape"]>>,
  //   Incoming["_def"]["unknownKeys"],
  //   Incoming["_def"]["catchall"]
  // > {
  //   // const mergedShape = objectUtil.mergeShapes(
  //   //   this._def.shape(),
  //   //   merging._def.shape()
  //   // );
  //   const merged: any = new ZodObject({
  //     unknownKeys: merging._def.unknownKeys,
  //     catchall: merging._def.catchall,
  //     shape: () =>
  //       objectUtil.mergeShapes(this._def.shape(), merging._def.shape()),
  //     typeName: ZodFirstPartyTypeKind.ZodObject,
  //   }) as any;
  //   return merged;
  // }
  catchall(index) {
    return new _ZodObject({
      ...this._def,
      catchall: index
    });
  }
  pick(mask) {
    const shape = {};
    util.objectKeys(mask).forEach((key) => {
      if (mask[key] && this.shape[key]) {
        shape[key] = this.shape[key];
      }
    });
    return new _ZodObject({
      ...this._def,
      shape: () => shape
    });
  }
  omit(mask) {
    const shape = {};
    util.objectKeys(this.shape).forEach((key) => {
      if (!mask[key]) {
        shape[key] = this.shape[key];
      }
    });
    return new _ZodObject({
      ...this._def,
      shape: () => shape
    });
  }
  /**
   * @deprecated
   */
  deepPartial() {
    return deepPartialify(this);
  }
  partial(mask) {
    const newShape = {};
    util.objectKeys(this.shape).forEach((key) => {
      const fieldSchema = this.shape[key];
      if (mask && !mask[key]) {
        newShape[key] = fieldSchema;
      } else {
        newShape[key] = fieldSchema.optional();
      }
    });
    return new _ZodObject({
      ...this._def,
      shape: () => newShape
    });
  }
  required(mask) {
    const newShape = {};
    util.objectKeys(this.shape).forEach((key) => {
      if (mask && !mask[key]) {
        newShape[key] = this.shape[key];
      } else {
        const fieldSchema = this.shape[key];
        let newField = fieldSchema;
        while (newField instanceof ZodOptional) {
          newField = newField._def.innerType;
        }
        newShape[key] = newField;
      }
    });
    return new _ZodObject({
      ...this._def,
      shape: () => newShape
    });
  }
  keyof() {
    return createZodEnum(util.objectKeys(this.shape));
  }
};
ZodObject.create = (shape, params) => {
  return new ZodObject({
    shape: () => shape,
    unknownKeys: "strip",
    catchall: ZodNever.create(),
    typeName: ZodFirstPartyTypeKind.ZodObject,
    ...processCreateParams(params)
  });
};
ZodObject.strictCreate = (shape, params) => {
  return new ZodObject({
    shape: () => shape,
    unknownKeys: "strict",
    catchall: ZodNever.create(),
    typeName: ZodFirstPartyTypeKind.ZodObject,
    ...processCreateParams(params)
  });
};
ZodObject.lazycreate = (shape, params) => {
  return new ZodObject({
    shape,
    unknownKeys: "strip",
    catchall: ZodNever.create(),
    typeName: ZodFirstPartyTypeKind.ZodObject,
    ...processCreateParams(params)
  });
};
var ZodUnion = class extends ZodType {
  _parse(input) {
    const { ctx } = this._processInputParams(input);
    const options = this._def.options;
    function handleResults(results) {
      for (const result of results) {
        if (result.result.status === "valid") {
          return result.result;
        }
      }
      for (const result of results) {
        if (result.result.status === "dirty") {
          ctx.common.issues.push(...result.ctx.common.issues);
          return result.result;
        }
      }
      const unionErrors = results.map((result) => new ZodError(result.ctx.common.issues));
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_union,
        unionErrors
      });
      return INVALID;
    }
    if (ctx.common.async) {
      return Promise.all(options.map(async (option) => {
        const childCtx = {
          ...ctx,
          common: {
            ...ctx.common,
            issues: []
          },
          parent: null
        };
        return {
          result: await option._parseAsync({
            data: ctx.data,
            path: ctx.path,
            parent: childCtx
          }),
          ctx: childCtx
        };
      })).then(handleResults);
    } else {
      let dirty = void 0;
      const issues = [];
      for (const option of options) {
        const childCtx = {
          ...ctx,
          common: {
            ...ctx.common,
            issues: []
          },
          parent: null
        };
        const result = option._parseSync({
          data: ctx.data,
          path: ctx.path,
          parent: childCtx
        });
        if (result.status === "valid") {
          return result;
        } else if (result.status === "dirty" && !dirty) {
          dirty = { result, ctx: childCtx };
        }
        if (childCtx.common.issues.length) {
          issues.push(childCtx.common.issues);
        }
      }
      if (dirty) {
        ctx.common.issues.push(...dirty.ctx.common.issues);
        return dirty.result;
      }
      const unionErrors = issues.map((issues2) => new ZodError(issues2));
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_union,
        unionErrors
      });
      return INVALID;
    }
  }
  get options() {
    return this._def.options;
  }
};
ZodUnion.create = (types, params) => {
  return new ZodUnion({
    options: types,
    typeName: ZodFirstPartyTypeKind.ZodUnion,
    ...processCreateParams(params)
  });
};
var getDiscriminator = (type) => {
  if (type instanceof ZodLazy) {
    return getDiscriminator(type.schema);
  } else if (type instanceof ZodEffects) {
    return getDiscriminator(type.innerType());
  } else if (type instanceof ZodLiteral) {
    return [type.value];
  } else if (type instanceof ZodEnum) {
    return type.options;
  } else if (type instanceof ZodNativeEnum) {
    return util.objectValues(type.enum);
  } else if (type instanceof ZodDefault) {
    return getDiscriminator(type._def.innerType);
  } else if (type instanceof ZodUndefined) {
    return [void 0];
  } else if (type instanceof ZodNull) {
    return [null];
  } else if (type instanceof ZodOptional) {
    return [void 0, ...getDiscriminator(type.unwrap())];
  } else if (type instanceof ZodNullable) {
    return [null, ...getDiscriminator(type.unwrap())];
  } else if (type instanceof ZodBranded) {
    return getDiscriminator(type.unwrap());
  } else if (type instanceof ZodReadonly) {
    return getDiscriminator(type.unwrap());
  } else if (type instanceof ZodCatch) {
    return getDiscriminator(type._def.innerType);
  } else {
    return [];
  }
};
var ZodDiscriminatedUnion = class _ZodDiscriminatedUnion extends ZodType {
  _parse(input) {
    const { ctx } = this._processInputParams(input);
    if (ctx.parsedType !== ZodParsedType.object) {
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.object,
        received: ctx.parsedType
      });
      return INVALID;
    }
    const discriminator = this.discriminator;
    const discriminatorValue = ctx.data[discriminator];
    const option = this.optionsMap.get(discriminatorValue);
    if (!option) {
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_union_discriminator,
        options: Array.from(this.optionsMap.keys()),
        path: [discriminator]
      });
      return INVALID;
    }
    if (ctx.common.async) {
      return option._parseAsync({
        data: ctx.data,
        path: ctx.path,
        parent: ctx
      });
    } else {
      return option._parseSync({
        data: ctx.data,
        path: ctx.path,
        parent: ctx
      });
    }
  }
  get discriminator() {
    return this._def.discriminator;
  }
  get options() {
    return this._def.options;
  }
  get optionsMap() {
    return this._def.optionsMap;
  }
  /**
   * The constructor of the discriminated union schema. Its behaviour is very similar to that of the normal z.union() constructor.
   * However, it only allows a union of objects, all of which need to share a discriminator property. This property must
   * have a different value for each object in the union.
   * @param discriminator the name of the discriminator property
   * @param types an array of object schemas
   * @param params
   */
  static create(discriminator, options, params) {
    const optionsMap = /* @__PURE__ */ new Map();
    for (const type of options) {
      const discriminatorValues = getDiscriminator(type.shape[discriminator]);
      if (!discriminatorValues.length) {
        throw new Error(`A discriminator value for key \`${discriminator}\` could not be extracted from all schema options`);
      }
      for (const value of discriminatorValues) {
        if (optionsMap.has(value)) {
          throw new Error(`Discriminator property ${String(discriminator)} has duplicate value ${String(value)}`);
        }
        optionsMap.set(value, type);
      }
    }
    return new _ZodDiscriminatedUnion({
      typeName: ZodFirstPartyTypeKind.ZodDiscriminatedUnion,
      discriminator,
      options,
      optionsMap,
      ...processCreateParams(params)
    });
  }
};
function mergeValues(a, b) {
  const aType = getParsedType(a);
  const bType = getParsedType(b);
  if (a === b) {
    return { valid: true, data: a };
  } else if (aType === ZodParsedType.object && bType === ZodParsedType.object) {
    const bKeys = util.objectKeys(b);
    const sharedKeys = util.objectKeys(a).filter((key) => bKeys.indexOf(key) !== -1);
    const newObj = { ...a, ...b };
    for (const key of sharedKeys) {
      const sharedValue = mergeValues(a[key], b[key]);
      if (!sharedValue.valid) {
        return { valid: false };
      }
      newObj[key] = sharedValue.data;
    }
    return { valid: true, data: newObj };
  } else if (aType === ZodParsedType.array && bType === ZodParsedType.array) {
    if (a.length !== b.length) {
      return { valid: false };
    }
    const newArray = [];
    for (let index = 0; index < a.length; index++) {
      const itemA = a[index];
      const itemB = b[index];
      const sharedValue = mergeValues(itemA, itemB);
      if (!sharedValue.valid) {
        return { valid: false };
      }
      newArray.push(sharedValue.data);
    }
    return { valid: true, data: newArray };
  } else if (aType === ZodParsedType.date && bType === ZodParsedType.date && +a === +b) {
    return { valid: true, data: a };
  } else {
    return { valid: false };
  }
}
var ZodIntersection = class extends ZodType {
  _parse(input) {
    const { status, ctx } = this._processInputParams(input);
    const handleParsed = (parsedLeft, parsedRight) => {
      if (isAborted(parsedLeft) || isAborted(parsedRight)) {
        return INVALID;
      }
      const merged = mergeValues(parsedLeft.value, parsedRight.value);
      if (!merged.valid) {
        addIssueToContext(ctx, {
          code: ZodIssueCode.invalid_intersection_types
        });
        return INVALID;
      }
      if (isDirty(parsedLeft) || isDirty(parsedRight)) {
        status.dirty();
      }
      return { status: status.value, value: merged.data };
    };
    if (ctx.common.async) {
      return Promise.all([
        this._def.left._parseAsync({
          data: ctx.data,
          path: ctx.path,
          parent: ctx
        }),
        this._def.right._parseAsync({
          data: ctx.data,
          path: ctx.path,
          parent: ctx
        })
      ]).then(([left, right]) => handleParsed(left, right));
    } else {
      return handleParsed(this._def.left._parseSync({
        data: ctx.data,
        path: ctx.path,
        parent: ctx
      }), this._def.right._parseSync({
        data: ctx.data,
        path: ctx.path,
        parent: ctx
      }));
    }
  }
};
ZodIntersection.create = (left, right, params) => {
  return new ZodIntersection({
    left,
    right,
    typeName: ZodFirstPartyTypeKind.ZodIntersection,
    ...processCreateParams(params)
  });
};
var ZodTuple = class _ZodTuple extends ZodType {
  _parse(input) {
    const { status, ctx } = this._processInputParams(input);
    if (ctx.parsedType !== ZodParsedType.array) {
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.array,
        received: ctx.parsedType
      });
      return INVALID;
    }
    if (ctx.data.length < this._def.items.length) {
      addIssueToContext(ctx, {
        code: ZodIssueCode.too_small,
        minimum: this._def.items.length,
        inclusive: true,
        exact: false,
        type: "array"
      });
      return INVALID;
    }
    const rest = this._def.rest;
    if (!rest && ctx.data.length > this._def.items.length) {
      addIssueToContext(ctx, {
        code: ZodIssueCode.too_big,
        maximum: this._def.items.length,
        inclusive: true,
        exact: false,
        type: "array"
      });
      status.dirty();
    }
    const items = [...ctx.data].map((item, itemIndex) => {
      const schema = this._def.items[itemIndex] || this._def.rest;
      if (!schema)
        return null;
      return schema._parse(new ParseInputLazyPath(ctx, item, ctx.path, itemIndex));
    }).filter((x) => !!x);
    if (ctx.common.async) {
      return Promise.all(items).then((results) => {
        return ParseStatus.mergeArray(status, results);
      });
    } else {
      return ParseStatus.mergeArray(status, items);
    }
  }
  get items() {
    return this._def.items;
  }
  rest(rest) {
    return new _ZodTuple({
      ...this._def,
      rest
    });
  }
};
ZodTuple.create = (schemas, params) => {
  if (!Array.isArray(schemas)) {
    throw new Error("You must pass an array of schemas to z.tuple([ ... ])");
  }
  return new ZodTuple({
    items: schemas,
    typeName: ZodFirstPartyTypeKind.ZodTuple,
    rest: null,
    ...processCreateParams(params)
  });
};
var ZodRecord = class _ZodRecord extends ZodType {
  get keySchema() {
    return this._def.keyType;
  }
  get valueSchema() {
    return this._def.valueType;
  }
  _parse(input) {
    const { status, ctx } = this._processInputParams(input);
    if (ctx.parsedType !== ZodParsedType.object) {
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.object,
        received: ctx.parsedType
      });
      return INVALID;
    }
    const pairs = [];
    const keyType = this._def.keyType;
    const valueType = this._def.valueType;
    for (const key in ctx.data) {
      pairs.push({
        key: keyType._parse(new ParseInputLazyPath(ctx, key, ctx.path, key)),
        value: valueType._parse(new ParseInputLazyPath(ctx, ctx.data[key], ctx.path, key)),
        alwaysSet: key in ctx.data
      });
    }
    if (ctx.common.async) {
      return ParseStatus.mergeObjectAsync(status, pairs);
    } else {
      return ParseStatus.mergeObjectSync(status, pairs);
    }
  }
  get element() {
    return this._def.valueType;
  }
  static create(first, second, third) {
    if (second instanceof ZodType) {
      return new _ZodRecord({
        keyType: first,
        valueType: second,
        typeName: ZodFirstPartyTypeKind.ZodRecord,
        ...processCreateParams(third)
      });
    }
    return new _ZodRecord({
      keyType: ZodString.create(),
      valueType: first,
      typeName: ZodFirstPartyTypeKind.ZodRecord,
      ...processCreateParams(second)
    });
  }
};
var ZodMap = class extends ZodType {
  get keySchema() {
    return this._def.keyType;
  }
  get valueSchema() {
    return this._def.valueType;
  }
  _parse(input) {
    const { status, ctx } = this._processInputParams(input);
    if (ctx.parsedType !== ZodParsedType.map) {
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.map,
        received: ctx.parsedType
      });
      return INVALID;
    }
    const keyType = this._def.keyType;
    const valueType = this._def.valueType;
    const pairs = [...ctx.data.entries()].map(([key, value], index) => {
      return {
        key: keyType._parse(new ParseInputLazyPath(ctx, key, ctx.path, [index, "key"])),
        value: valueType._parse(new ParseInputLazyPath(ctx, value, ctx.path, [index, "value"]))
      };
    });
    if (ctx.common.async) {
      const finalMap = /* @__PURE__ */ new Map();
      return Promise.resolve().then(async () => {
        for (const pair of pairs) {
          const key = await pair.key;
          const value = await pair.value;
          if (key.status === "aborted" || value.status === "aborted") {
            return INVALID;
          }
          if (key.status === "dirty" || value.status === "dirty") {
            status.dirty();
          }
          finalMap.set(key.value, value.value);
        }
        return { status: status.value, value: finalMap };
      });
    } else {
      const finalMap = /* @__PURE__ */ new Map();
      for (const pair of pairs) {
        const key = pair.key;
        const value = pair.value;
        if (key.status === "aborted" || value.status === "aborted") {
          return INVALID;
        }
        if (key.status === "dirty" || value.status === "dirty") {
          status.dirty();
        }
        finalMap.set(key.value, value.value);
      }
      return { status: status.value, value: finalMap };
    }
  }
};
ZodMap.create = (keyType, valueType, params) => {
  return new ZodMap({
    valueType,
    keyType,
    typeName: ZodFirstPartyTypeKind.ZodMap,
    ...processCreateParams(params)
  });
};
var ZodSet = class _ZodSet extends ZodType {
  _parse(input) {
    const { status, ctx } = this._processInputParams(input);
    if (ctx.parsedType !== ZodParsedType.set) {
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.set,
        received: ctx.parsedType
      });
      return INVALID;
    }
    const def = this._def;
    if (def.minSize !== null) {
      if (ctx.data.size < def.minSize.value) {
        addIssueToContext(ctx, {
          code: ZodIssueCode.too_small,
          minimum: def.minSize.value,
          type: "set",
          inclusive: true,
          exact: false,
          message: def.minSize.message
        });
        status.dirty();
      }
    }
    if (def.maxSize !== null) {
      if (ctx.data.size > def.maxSize.value) {
        addIssueToContext(ctx, {
          code: ZodIssueCode.too_big,
          maximum: def.maxSize.value,
          type: "set",
          inclusive: true,
          exact: false,
          message: def.maxSize.message
        });
        status.dirty();
      }
    }
    const valueType = this._def.valueType;
    function finalizeSet(elements2) {
      const parsedSet = /* @__PURE__ */ new Set();
      for (const element of elements2) {
        if (element.status === "aborted")
          return INVALID;
        if (element.status === "dirty")
          status.dirty();
        parsedSet.add(element.value);
      }
      return { status: status.value, value: parsedSet };
    }
    const elements = [...ctx.data.values()].map((item, i) => valueType._parse(new ParseInputLazyPath(ctx, item, ctx.path, i)));
    if (ctx.common.async) {
      return Promise.all(elements).then((elements2) => finalizeSet(elements2));
    } else {
      return finalizeSet(elements);
    }
  }
  min(minSize, message) {
    return new _ZodSet({
      ...this._def,
      minSize: { value: minSize, message: errorUtil.toString(message) }
    });
  }
  max(maxSize, message) {
    return new _ZodSet({
      ...this._def,
      maxSize: { value: maxSize, message: errorUtil.toString(message) }
    });
  }
  size(size, message) {
    return this.min(size, message).max(size, message);
  }
  nonempty(message) {
    return this.min(1, message);
  }
};
ZodSet.create = (valueType, params) => {
  return new ZodSet({
    valueType,
    minSize: null,
    maxSize: null,
    typeName: ZodFirstPartyTypeKind.ZodSet,
    ...processCreateParams(params)
  });
};
var ZodFunction = class _ZodFunction extends ZodType {
  constructor() {
    super(...arguments);
    this.validate = this.implement;
  }
  _parse(input) {
    const { ctx } = this._processInputParams(input);
    if (ctx.parsedType !== ZodParsedType.function) {
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.function,
        received: ctx.parsedType
      });
      return INVALID;
    }
    function makeArgsIssue(args, error) {
      return makeIssue({
        data: args,
        path: ctx.path,
        errorMaps: [
          ctx.common.contextualErrorMap,
          ctx.schemaErrorMap,
          getErrorMap(),
          errorMap
        ].filter((x) => !!x),
        issueData: {
          code: ZodIssueCode.invalid_arguments,
          argumentsError: error
        }
      });
    }
    function makeReturnsIssue(returns, error) {
      return makeIssue({
        data: returns,
        path: ctx.path,
        errorMaps: [
          ctx.common.contextualErrorMap,
          ctx.schemaErrorMap,
          getErrorMap(),
          errorMap
        ].filter((x) => !!x),
        issueData: {
          code: ZodIssueCode.invalid_return_type,
          returnTypeError: error
        }
      });
    }
    const params = { errorMap: ctx.common.contextualErrorMap };
    const fn = ctx.data;
    if (this._def.returns instanceof ZodPromise) {
      const me = this;
      return OK(async function(...args) {
        const error = new ZodError([]);
        const parsedArgs = await me._def.args.parseAsync(args, params).catch((e) => {
          error.addIssue(makeArgsIssue(args, e));
          throw error;
        });
        const result = await Reflect.apply(fn, this, parsedArgs);
        const parsedReturns = await me._def.returns._def.type.parseAsync(result, params).catch((e) => {
          error.addIssue(makeReturnsIssue(result, e));
          throw error;
        });
        return parsedReturns;
      });
    } else {
      const me = this;
      return OK(function(...args) {
        const parsedArgs = me._def.args.safeParse(args, params);
        if (!parsedArgs.success) {
          throw new ZodError([makeArgsIssue(args, parsedArgs.error)]);
        }
        const result = Reflect.apply(fn, this, parsedArgs.data);
        const parsedReturns = me._def.returns.safeParse(result, params);
        if (!parsedReturns.success) {
          throw new ZodError([makeReturnsIssue(result, parsedReturns.error)]);
        }
        return parsedReturns.data;
      });
    }
  }
  parameters() {
    return this._def.args;
  }
  returnType() {
    return this._def.returns;
  }
  args(...items) {
    return new _ZodFunction({
      ...this._def,
      args: ZodTuple.create(items).rest(ZodUnknown.create())
    });
  }
  returns(returnType) {
    return new _ZodFunction({
      ...this._def,
      returns: returnType
    });
  }
  implement(func) {
    const validatedFunc = this.parse(func);
    return validatedFunc;
  }
  strictImplement(func) {
    const validatedFunc = this.parse(func);
    return validatedFunc;
  }
  static create(args, returns, params) {
    return new _ZodFunction({
      args: args ? args : ZodTuple.create([]).rest(ZodUnknown.create()),
      returns: returns || ZodUnknown.create(),
      typeName: ZodFirstPartyTypeKind.ZodFunction,
      ...processCreateParams(params)
    });
  }
};
var ZodLazy = class extends ZodType {
  get schema() {
    return this._def.getter();
  }
  _parse(input) {
    const { ctx } = this._processInputParams(input);
    const lazySchema = this._def.getter();
    return lazySchema._parse({ data: ctx.data, path: ctx.path, parent: ctx });
  }
};
ZodLazy.create = (getter, params) => {
  return new ZodLazy({
    getter,
    typeName: ZodFirstPartyTypeKind.ZodLazy,
    ...processCreateParams(params)
  });
};
var ZodLiteral = class extends ZodType {
  _parse(input) {
    if (input.data !== this._def.value) {
      const ctx = this._getOrReturnCtx(input);
      addIssueToContext(ctx, {
        received: ctx.data,
        code: ZodIssueCode.invalid_literal,
        expected: this._def.value
      });
      return INVALID;
    }
    return { status: "valid", value: input.data };
  }
  get value() {
    return this._def.value;
  }
};
ZodLiteral.create = (value, params) => {
  return new ZodLiteral({
    value,
    typeName: ZodFirstPartyTypeKind.ZodLiteral,
    ...processCreateParams(params)
  });
};
function createZodEnum(values, params) {
  return new ZodEnum({
    values,
    typeName: ZodFirstPartyTypeKind.ZodEnum,
    ...processCreateParams(params)
  });
}
var ZodEnum = class _ZodEnum extends ZodType {
  constructor() {
    super(...arguments);
    _ZodEnum_cache.set(this, void 0);
  }
  _parse(input) {
    if (typeof input.data !== "string") {
      const ctx = this._getOrReturnCtx(input);
      const expectedValues = this._def.values;
      addIssueToContext(ctx, {
        expected: util.joinValues(expectedValues),
        received: ctx.parsedType,
        code: ZodIssueCode.invalid_type
      });
      return INVALID;
    }
    if (!__classPrivateFieldGet(this, _ZodEnum_cache, "f")) {
      __classPrivateFieldSet(this, _ZodEnum_cache, new Set(this._def.values), "f");
    }
    if (!__classPrivateFieldGet(this, _ZodEnum_cache, "f").has(input.data)) {
      const ctx = this._getOrReturnCtx(input);
      const expectedValues = this._def.values;
      addIssueToContext(ctx, {
        received: ctx.data,
        code: ZodIssueCode.invalid_enum_value,
        options: expectedValues
      });
      return INVALID;
    }
    return OK(input.data);
  }
  get options() {
    return this._def.values;
  }
  get enum() {
    const enumValues = {};
    for (const val of this._def.values) {
      enumValues[val] = val;
    }
    return enumValues;
  }
  get Values() {
    const enumValues = {};
    for (const val of this._def.values) {
      enumValues[val] = val;
    }
    return enumValues;
  }
  get Enum() {
    const enumValues = {};
    for (const val of this._def.values) {
      enumValues[val] = val;
    }
    return enumValues;
  }
  extract(values, newDef = this._def) {
    return _ZodEnum.create(values, {
      ...this._def,
      ...newDef
    });
  }
  exclude(values, newDef = this._def) {
    return _ZodEnum.create(this.options.filter((opt) => !values.includes(opt)), {
      ...this._def,
      ...newDef
    });
  }
};
_ZodEnum_cache = /* @__PURE__ */ new WeakMap();
ZodEnum.create = createZodEnum;
var ZodNativeEnum = class extends ZodType {
  constructor() {
    super(...arguments);
    _ZodNativeEnum_cache.set(this, void 0);
  }
  _parse(input) {
    const nativeEnumValues = util.getValidEnumValues(this._def.values);
    const ctx = this._getOrReturnCtx(input);
    if (ctx.parsedType !== ZodParsedType.string && ctx.parsedType !== ZodParsedType.number) {
      const expectedValues = util.objectValues(nativeEnumValues);
      addIssueToContext(ctx, {
        expected: util.joinValues(expectedValues),
        received: ctx.parsedType,
        code: ZodIssueCode.invalid_type
      });
      return INVALID;
    }
    if (!__classPrivateFieldGet(this, _ZodNativeEnum_cache, "f")) {
      __classPrivateFieldSet(this, _ZodNativeEnum_cache, new Set(util.getValidEnumValues(this._def.values)), "f");
    }
    if (!__classPrivateFieldGet(this, _ZodNativeEnum_cache, "f").has(input.data)) {
      const expectedValues = util.objectValues(nativeEnumValues);
      addIssueToContext(ctx, {
        received: ctx.data,
        code: ZodIssueCode.invalid_enum_value,
        options: expectedValues
      });
      return INVALID;
    }
    return OK(input.data);
  }
  get enum() {
    return this._def.values;
  }
};
_ZodNativeEnum_cache = /* @__PURE__ */ new WeakMap();
ZodNativeEnum.create = (values, params) => {
  return new ZodNativeEnum({
    values,
    typeName: ZodFirstPartyTypeKind.ZodNativeEnum,
    ...processCreateParams(params)
  });
};
var ZodPromise = class extends ZodType {
  unwrap() {
    return this._def.type;
  }
  _parse(input) {
    const { ctx } = this._processInputParams(input);
    if (ctx.parsedType !== ZodParsedType.promise && ctx.common.async === false) {
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.promise,
        received: ctx.parsedType
      });
      return INVALID;
    }
    const promisified = ctx.parsedType === ZodParsedType.promise ? ctx.data : Promise.resolve(ctx.data);
    return OK(promisified.then((data) => {
      return this._def.type.parseAsync(data, {
        path: ctx.path,
        errorMap: ctx.common.contextualErrorMap
      });
    }));
  }
};
ZodPromise.create = (schema, params) => {
  return new ZodPromise({
    type: schema,
    typeName: ZodFirstPartyTypeKind.ZodPromise,
    ...processCreateParams(params)
  });
};
var ZodEffects = class extends ZodType {
  innerType() {
    return this._def.schema;
  }
  sourceType() {
    return this._def.schema._def.typeName === ZodFirstPartyTypeKind.ZodEffects ? this._def.schema.sourceType() : this._def.schema;
  }
  _parse(input) {
    const { status, ctx } = this._processInputParams(input);
    const effect = this._def.effect || null;
    const checkCtx = {
      addIssue: (arg) => {
        addIssueToContext(ctx, arg);
        if (arg.fatal) {
          status.abort();
        } else {
          status.dirty();
        }
      },
      get path() {
        return ctx.path;
      }
    };
    checkCtx.addIssue = checkCtx.addIssue.bind(checkCtx);
    if (effect.type === "preprocess") {
      const processed = effect.transform(ctx.data, checkCtx);
      if (ctx.common.async) {
        return Promise.resolve(processed).then(async (processed2) => {
          if (status.value === "aborted")
            return INVALID;
          const result = await this._def.schema._parseAsync({
            data: processed2,
            path: ctx.path,
            parent: ctx
          });
          if (result.status === "aborted")
            return INVALID;
          if (result.status === "dirty")
            return DIRTY(result.value);
          if (status.value === "dirty")
            return DIRTY(result.value);
          return result;
        });
      } else {
        if (status.value === "aborted")
          return INVALID;
        const result = this._def.schema._parseSync({
          data: processed,
          path: ctx.path,
          parent: ctx
        });
        if (result.status === "aborted")
          return INVALID;
        if (result.status === "dirty")
          return DIRTY(result.value);
        if (status.value === "dirty")
          return DIRTY(result.value);
        return result;
      }
    }
    if (effect.type === "refinement") {
      const executeRefinement = (acc) => {
        const result = effect.refinement(acc, checkCtx);
        if (ctx.common.async) {
          return Promise.resolve(result);
        }
        if (result instanceof Promise) {
          throw new Error("Async refinement encountered during synchronous parse operation. Use .parseAsync instead.");
        }
        return acc;
      };
      if (ctx.common.async === false) {
        const inner = this._def.schema._parseSync({
          data: ctx.data,
          path: ctx.path,
          parent: ctx
        });
        if (inner.status === "aborted")
          return INVALID;
        if (inner.status === "dirty")
          status.dirty();
        executeRefinement(inner.value);
        return { status: status.value, value: inner.value };
      } else {
        return this._def.schema._parseAsync({ data: ctx.data, path: ctx.path, parent: ctx }).then((inner) => {
          if (inner.status === "aborted")
            return INVALID;
          if (inner.status === "dirty")
            status.dirty();
          return executeRefinement(inner.value).then(() => {
            return { status: status.value, value: inner.value };
          });
        });
      }
    }
    if (effect.type === "transform") {
      if (ctx.common.async === false) {
        const base = this._def.schema._parseSync({
          data: ctx.data,
          path: ctx.path,
          parent: ctx
        });
        if (!isValid(base))
          return base;
        const result = effect.transform(base.value, checkCtx);
        if (result instanceof Promise) {
          throw new Error(`Asynchronous transform encountered during synchronous parse operation. Use .parseAsync instead.`);
        }
        return { status: status.value, value: result };
      } else {
        return this._def.schema._parseAsync({ data: ctx.data, path: ctx.path, parent: ctx }).then((base) => {
          if (!isValid(base))
            return base;
          return Promise.resolve(effect.transform(base.value, checkCtx)).then((result) => ({ status: status.value, value: result }));
        });
      }
    }
    util.assertNever(effect);
  }
};
ZodEffects.create = (schema, effect, params) => {
  return new ZodEffects({
    schema,
    typeName: ZodFirstPartyTypeKind.ZodEffects,
    effect,
    ...processCreateParams(params)
  });
};
ZodEffects.createWithPreprocess = (preprocess, schema, params) => {
  return new ZodEffects({
    schema,
    effect: { type: "preprocess", transform: preprocess },
    typeName: ZodFirstPartyTypeKind.ZodEffects,
    ...processCreateParams(params)
  });
};
var ZodOptional = class extends ZodType {
  _parse(input) {
    const parsedType = this._getType(input);
    if (parsedType === ZodParsedType.undefined) {
      return OK(void 0);
    }
    return this._def.innerType._parse(input);
  }
  unwrap() {
    return this._def.innerType;
  }
};
ZodOptional.create = (type, params) => {
  return new ZodOptional({
    innerType: type,
    typeName: ZodFirstPartyTypeKind.ZodOptional,
    ...processCreateParams(params)
  });
};
var ZodNullable = class extends ZodType {
  _parse(input) {
    const parsedType = this._getType(input);
    if (parsedType === ZodParsedType.null) {
      return OK(null);
    }
    return this._def.innerType._parse(input);
  }
  unwrap() {
    return this._def.innerType;
  }
};
ZodNullable.create = (type, params) => {
  return new ZodNullable({
    innerType: type,
    typeName: ZodFirstPartyTypeKind.ZodNullable,
    ...processCreateParams(params)
  });
};
var ZodDefault = class extends ZodType {
  _parse(input) {
    const { ctx } = this._processInputParams(input);
    let data = ctx.data;
    if (ctx.parsedType === ZodParsedType.undefined) {
      data = this._def.defaultValue();
    }
    return this._def.innerType._parse({
      data,
      path: ctx.path,
      parent: ctx
    });
  }
  removeDefault() {
    return this._def.innerType;
  }
};
ZodDefault.create = (type, params) => {
  return new ZodDefault({
    innerType: type,
    typeName: ZodFirstPartyTypeKind.ZodDefault,
    defaultValue: typeof params.default === "function" ? params.default : () => params.default,
    ...processCreateParams(params)
  });
};
var ZodCatch = class extends ZodType {
  _parse(input) {
    const { ctx } = this._processInputParams(input);
    const newCtx = {
      ...ctx,
      common: {
        ...ctx.common,
        issues: []
      }
    };
    const result = this._def.innerType._parse({
      data: newCtx.data,
      path: newCtx.path,
      parent: {
        ...newCtx
      }
    });
    if (isAsync(result)) {
      return result.then((result2) => {
        return {
          status: "valid",
          value: result2.status === "valid" ? result2.value : this._def.catchValue({
            get error() {
              return new ZodError(newCtx.common.issues);
            },
            input: newCtx.data
          })
        };
      });
    } else {
      return {
        status: "valid",
        value: result.status === "valid" ? result.value : this._def.catchValue({
          get error() {
            return new ZodError(newCtx.common.issues);
          },
          input: newCtx.data
        })
      };
    }
  }
  removeCatch() {
    return this._def.innerType;
  }
};
ZodCatch.create = (type, params) => {
  return new ZodCatch({
    innerType: type,
    typeName: ZodFirstPartyTypeKind.ZodCatch,
    catchValue: typeof params.catch === "function" ? params.catch : () => params.catch,
    ...processCreateParams(params)
  });
};
var ZodNaN = class extends ZodType {
  _parse(input) {
    const parsedType = this._getType(input);
    if (parsedType !== ZodParsedType.nan) {
      const ctx = this._getOrReturnCtx(input);
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.nan,
        received: ctx.parsedType
      });
      return INVALID;
    }
    return { status: "valid", value: input.data };
  }
};
ZodNaN.create = (params) => {
  return new ZodNaN({
    typeName: ZodFirstPartyTypeKind.ZodNaN,
    ...processCreateParams(params)
  });
};
var BRAND = Symbol("zod_brand");
var ZodBranded = class extends ZodType {
  _parse(input) {
    const { ctx } = this._processInputParams(input);
    const data = ctx.data;
    return this._def.type._parse({
      data,
      path: ctx.path,
      parent: ctx
    });
  }
  unwrap() {
    return this._def.type;
  }
};
var ZodPipeline = class _ZodPipeline extends ZodType {
  _parse(input) {
    const { status, ctx } = this._processInputParams(input);
    if (ctx.common.async) {
      const handleAsync = async () => {
        const inResult = await this._def.in._parseAsync({
          data: ctx.data,
          path: ctx.path,
          parent: ctx
        });
        if (inResult.status === "aborted")
          return INVALID;
        if (inResult.status === "dirty") {
          status.dirty();
          return DIRTY(inResult.value);
        } else {
          return this._def.out._parseAsync({
            data: inResult.value,
            path: ctx.path,
            parent: ctx
          });
        }
      };
      return handleAsync();
    } else {
      const inResult = this._def.in._parseSync({
        data: ctx.data,
        path: ctx.path,
        parent: ctx
      });
      if (inResult.status === "aborted")
        return INVALID;
      if (inResult.status === "dirty") {
        status.dirty();
        return {
          status: "dirty",
          value: inResult.value
        };
      } else {
        return this._def.out._parseSync({
          data: inResult.value,
          path: ctx.path,
          parent: ctx
        });
      }
    }
  }
  static create(a, b) {
    return new _ZodPipeline({
      in: a,
      out: b,
      typeName: ZodFirstPartyTypeKind.ZodPipeline
    });
  }
};
var ZodReadonly = class extends ZodType {
  _parse(input) {
    const result = this._def.innerType._parse(input);
    const freeze = (data) => {
      if (isValid(data)) {
        data.value = Object.freeze(data.value);
      }
      return data;
    };
    return isAsync(result) ? result.then((data) => freeze(data)) : freeze(result);
  }
  unwrap() {
    return this._def.innerType;
  }
};
ZodReadonly.create = (type, params) => {
  return new ZodReadonly({
    innerType: type,
    typeName: ZodFirstPartyTypeKind.ZodReadonly,
    ...processCreateParams(params)
  });
};
function custom(check, params = {}, fatal) {
  if (check)
    return ZodAny.create().superRefine((data, ctx) => {
      var _a, _b;
      if (!check(data)) {
        const p = typeof params === "function" ? params(data) : typeof params === "string" ? { message: params } : params;
        const _fatal = (_b = (_a = p.fatal) !== null && _a !== void 0 ? _a : fatal) !== null && _b !== void 0 ? _b : true;
        const p2 = typeof p === "string" ? { message: p } : p;
        ctx.addIssue({ code: "custom", ...p2, fatal: _fatal });
      }
    });
  return ZodAny.create();
}
var late = {
  object: ZodObject.lazycreate
};
var ZodFirstPartyTypeKind;
(function(ZodFirstPartyTypeKind2) {
  ZodFirstPartyTypeKind2["ZodString"] = "ZodString";
  ZodFirstPartyTypeKind2["ZodNumber"] = "ZodNumber";
  ZodFirstPartyTypeKind2["ZodNaN"] = "ZodNaN";
  ZodFirstPartyTypeKind2["ZodBigInt"] = "ZodBigInt";
  ZodFirstPartyTypeKind2["ZodBoolean"] = "ZodBoolean";
  ZodFirstPartyTypeKind2["ZodDate"] = "ZodDate";
  ZodFirstPartyTypeKind2["ZodSymbol"] = "ZodSymbol";
  ZodFirstPartyTypeKind2["ZodUndefined"] = "ZodUndefined";
  ZodFirstPartyTypeKind2["ZodNull"] = "ZodNull";
  ZodFirstPartyTypeKind2["ZodAny"] = "ZodAny";
  ZodFirstPartyTypeKind2["ZodUnknown"] = "ZodUnknown";
  ZodFirstPartyTypeKind2["ZodNever"] = "ZodNever";
  ZodFirstPartyTypeKind2["ZodVoid"] = "ZodVoid";
  ZodFirstPartyTypeKind2["ZodArray"] = "ZodArray";
  ZodFirstPartyTypeKind2["ZodObject"] = "ZodObject";
  ZodFirstPartyTypeKind2["ZodUnion"] = "ZodUnion";
  ZodFirstPartyTypeKind2["ZodDiscriminatedUnion"] = "ZodDiscriminatedUnion";
  ZodFirstPartyTypeKind2["ZodIntersection"] = "ZodIntersection";
  ZodFirstPartyTypeKind2["ZodTuple"] = "ZodTuple";
  ZodFirstPartyTypeKind2["ZodRecord"] = "ZodRecord";
  ZodFirstPartyTypeKind2["ZodMap"] = "ZodMap";
  ZodFirstPartyTypeKind2["ZodSet"] = "ZodSet";
  ZodFirstPartyTypeKind2["ZodFunction"] = "ZodFunction";
  ZodFirstPartyTypeKind2["ZodLazy"] = "ZodLazy";
  ZodFirstPartyTypeKind2["ZodLiteral"] = "ZodLiteral";
  ZodFirstPartyTypeKind2["ZodEnum"] = "ZodEnum";
  ZodFirstPartyTypeKind2["ZodEffects"] = "ZodEffects";
  ZodFirstPartyTypeKind2["ZodNativeEnum"] = "ZodNativeEnum";
  ZodFirstPartyTypeKind2["ZodOptional"] = "ZodOptional";
  ZodFirstPartyTypeKind2["ZodNullable"] = "ZodNullable";
  ZodFirstPartyTypeKind2["ZodDefault"] = "ZodDefault";
  ZodFirstPartyTypeKind2["ZodCatch"] = "ZodCatch";
  ZodFirstPartyTypeKind2["ZodPromise"] = "ZodPromise";
  ZodFirstPartyTypeKind2["ZodBranded"] = "ZodBranded";
  ZodFirstPartyTypeKind2["ZodPipeline"] = "ZodPipeline";
  ZodFirstPartyTypeKind2["ZodReadonly"] = "ZodReadonly";
})(ZodFirstPartyTypeKind || (ZodFirstPartyTypeKind = {}));
var instanceOfType = (cls, params = {
  message: `Input not instance of ${cls.name}`
}) => custom((data) => data instanceof cls, params);
var stringType = ZodString.create;
var numberType = ZodNumber.create;
var nanType = ZodNaN.create;
var bigIntType = ZodBigInt.create;
var booleanType = ZodBoolean.create;
var dateType = ZodDate.create;
var symbolType = ZodSymbol.create;
var undefinedType = ZodUndefined.create;
var nullType = ZodNull.create;
var anyType = ZodAny.create;
var unknownType = ZodUnknown.create;
var neverType = ZodNever.create;
var voidType = ZodVoid.create;
var arrayType = ZodArray.create;
var objectType = ZodObject.create;
var strictObjectType = ZodObject.strictCreate;
var unionType = ZodUnion.create;
var discriminatedUnionType = ZodDiscriminatedUnion.create;
var intersectionType = ZodIntersection.create;
var tupleType = ZodTuple.create;
var recordType = ZodRecord.create;
var mapType = ZodMap.create;
var setType = ZodSet.create;
var functionType = ZodFunction.create;
var lazyType = ZodLazy.create;
var literalType = ZodLiteral.create;
var enumType = ZodEnum.create;
var nativeEnumType = ZodNativeEnum.create;
var promiseType = ZodPromise.create;
var effectsType = ZodEffects.create;
var optionalType = ZodOptional.create;
var nullableType = ZodNullable.create;
var preprocessType = ZodEffects.createWithPreprocess;
var pipelineType = ZodPipeline.create;
var ostring = () => stringType().optional();
var onumber = () => numberType().optional();
var oboolean = () => booleanType().optional();
var coerce = {
  string: (arg) => ZodString.create({ ...arg, coerce: true }),
  number: (arg) => ZodNumber.create({ ...arg, coerce: true }),
  boolean: (arg) => ZodBoolean.create({
    ...arg,
    coerce: true
  }),
  bigint: (arg) => ZodBigInt.create({ ...arg, coerce: true }),
  date: (arg) => ZodDate.create({ ...arg, coerce: true })
};
var NEVER = INVALID;
var z = /* @__PURE__ */ Object.freeze({
  __proto__: null,
  defaultErrorMap: errorMap,
  setErrorMap,
  getErrorMap,
  makeIssue,
  EMPTY_PATH,
  addIssueToContext,
  ParseStatus,
  INVALID,
  DIRTY,
  OK,
  isAborted,
  isDirty,
  isValid,
  isAsync,
  get util() {
    return util;
  },
  get objectUtil() {
    return objectUtil;
  },
  ZodParsedType,
  getParsedType,
  ZodType,
  datetimeRegex,
  ZodString,
  ZodNumber,
  ZodBigInt,
  ZodBoolean,
  ZodDate,
  ZodSymbol,
  ZodUndefined,
  ZodNull,
  ZodAny,
  ZodUnknown,
  ZodNever,
  ZodVoid,
  ZodArray,
  ZodObject,
  ZodUnion,
  ZodDiscriminatedUnion,
  ZodIntersection,
  ZodTuple,
  ZodRecord,
  ZodMap,
  ZodSet,
  ZodFunction,
  ZodLazy,
  ZodLiteral,
  ZodEnum,
  ZodNativeEnum,
  ZodPromise,
  ZodEffects,
  ZodTransformer: ZodEffects,
  ZodOptional,
  ZodNullable,
  ZodDefault,
  ZodCatch,
  ZodNaN,
  BRAND,
  ZodBranded,
  ZodPipeline,
  ZodReadonly,
  custom,
  Schema: ZodType,
  ZodSchema: ZodType,
  late,
  get ZodFirstPartyTypeKind() {
    return ZodFirstPartyTypeKind;
  },
  coerce,
  any: anyType,
  array: arrayType,
  bigint: bigIntType,
  boolean: booleanType,
  date: dateType,
  discriminatedUnion: discriminatedUnionType,
  effect: effectsType,
  "enum": enumType,
  "function": functionType,
  "instanceof": instanceOfType,
  intersection: intersectionType,
  lazy: lazyType,
  literal: literalType,
  map: mapType,
  nan: nanType,
  nativeEnum: nativeEnumType,
  never: neverType,
  "null": nullType,
  nullable: nullableType,
  number: numberType,
  object: objectType,
  oboolean,
  onumber,
  optional: optionalType,
  ostring,
  pipeline: pipelineType,
  preprocess: preprocessType,
  promise: promiseType,
  record: recordType,
  set: setType,
  strictObject: strictObjectType,
  string: stringType,
  symbol: symbolType,
  transformer: effectsType,
  tuple: tupleType,
  "undefined": undefinedType,
  union: unionType,
  unknown: unknownType,
  "void": voidType,
  NEVER,
  ZodIssueCode,
  quotelessJson,
  ZodError
});

// src/environment.ts
var coingeckoConfigSchema = z.object({
  COINGECKO_API_KEY: z.string().nullable(),
  COINGECKO_PRO_API_KEY: z.string().nullable()
}).refine((data) => data.COINGECKO_API_KEY || data.COINGECKO_PRO_API_KEY, {
  message: "Either COINGECKO_API_KEY or COINGECKO_PRO_API_KEY must be provided"
});
async function validateCoingeckoConfig(runtime) {
  const config = {
    COINGECKO_API_KEY: runtime.getSetting("COINGECKO_API_KEY"),
    COINGECKO_PRO_API_KEY: runtime.getSetting("COINGECKO_PRO_API_KEY")
  };
  return coingeckoConfigSchema.parse(config);
}
function getApiConfig(config) {
  const isPro = !!config.COINGECKO_PRO_API_KEY;
  return {
    baseUrl: isPro ? "https://pro-api.coingecko.com/api/v3" : "https://api.coingecko.com/api/v3",
    apiKey: isPro ? config.COINGECKO_PRO_API_KEY : config.COINGECKO_API_KEY,
    headerKey: isPro ? "x-cg-pro-api-key" : "x-cg-demo-api-key"
  };
}

// src/providers/categoriesProvider.ts
import { elizaLogger } from "@elizaos/core";
import axios from "axios";
var CACHE_KEY = "coingecko:categories";
var CACHE_TTL = 5 * 60;
var MAX_RETRIES = 3;
async function fetchCategories(runtime) {
  const config = await validateCoingeckoConfig(runtime);
  const { baseUrl, apiKey, headerKey } = getApiConfig(config);
  const response = await axios.get(
    `${baseUrl}/coins/categories/list`,
    {
      headers: {
        "accept": "application/json",
        [headerKey]: apiKey
      },
      timeout: 5e3
      // 5 second timeout
    }
  );
  if (!response.data?.length) {
    throw new Error("Invalid categories data received");
  }
  return response.data;
}
async function fetchWithRetry(runtime) {
  let lastError = null;
  for (let i = 0; i < MAX_RETRIES; i++) {
    try {
      return await fetchCategories(runtime);
    } catch (error) {
      lastError = error;
      elizaLogger.error(`Categories fetch attempt ${i + 1} failed:`, error);
      await new Promise((resolve) => setTimeout(resolve, 1e3 * (i + 1)));
    }
  }
  throw lastError || new Error("Failed to fetch categories after multiple attempts");
}
async function getCategories(runtime) {
  try {
    const cached = await runtime.cacheManager.get(CACHE_KEY);
    if (cached) {
      return cached;
    }
    const categories = await fetchWithRetry(runtime);
    await runtime.cacheManager.set(CACHE_KEY, categories, { expires: CACHE_TTL });
    return categories;
  } catch (error) {
    elizaLogger.error("Error fetching categories:", error);
    throw error;
  }
}
function formatCategoriesContext(categories) {
  const popularCategories = [
    "layer-1",
    "defi",
    "meme",
    "ai-meme-coins",
    "artificial-intelligence",
    "gaming",
    "metaverse"
  ];
  const popular = categories.filter((c) => popularCategories.includes(c.category_id)).map((c) => `${c.name} (${c.category_id})`);
  return `
Available cryptocurrency categories:

Popular categories:
${popular.map((c) => `- ${c}`).join("\n")}

Total available categories: ${categories.length}

You can use these category IDs when filtering cryptocurrency market data.
`.trim();
}
var categoriesProvider = {
  // eslint-disable-next-line
  get: async (runtime, message, state) => {
    try {
      const categories = await getCategories(runtime);
      return formatCategoriesContext(categories);
    } catch (error) {
      elizaLogger.error("Categories provider error:", error);
      return "Cryptocurrency categories are temporarily unavailable. Please try again later.";
    }
  }
};
async function getCategoriesData(runtime) {
  return getCategories(runtime);
}

// src/templates/markets.ts
var getMarketsTemplate = `
Extract the following parameters for market listing:
- **vs_currency** (string): Target currency for price data (default: "usd")
- **category** (string, optional): Specific category ID from the available categories
- **per_page** (number): Number of results to return (1-250, default: 20)
- **order** (string): Sort order for results, one of:
  - market_cap_desc: Highest market cap first
  - market_cap_asc: Lowest market cap first
  - volume_desc: Highest volume first
  - volume_asc: Lowest volume first

Available Categories:
{{categories}}

Provide the values in the following JSON format:

\`\`\`json
{
    "vs_currency": "<currency>",
    "category": "<category_id>",
    "per_page": <number>,
    "order": "<sort_order>",
    "page": 1,
    "sparkline": false
}
\`\`\`

Example request: "Show me the top 10 gaming cryptocurrencies"
Example response:
\`\`\`json
{
    "vs_currency": "usd",
    "category": "gaming",
    "per_page": 10,
    "order": "market_cap_desc",
    "page": 1,
    "sparkline": false
}
\`\`\`

Example request: "What are the best performing coins by volume?"
Example response:
\`\`\`json
{
    "vs_currency": "usd",
    "per_page": 20,
    "order": "volume_desc",
    "page": 1,
    "sparkline": false
}
\`\`\`

Here are the recent user messages for context:
{{recentMessages}}

Based on the conversation above, if the request is for a market listing/ranking, extract the appropriate parameters and respond with a JSON object. If the request is for specific coins only, respond with null.`;

// src/actions/getMarkets.ts
function formatCategory(category, categories) {
  if (!category) return void 0;
  const normalizedInput = category.toLowerCase().trim();
  const exactMatch = categories.find((c) => c.category_id === normalizedInput);
  if (exactMatch) {
    return exactMatch.category_id;
  }
  const nameMatch = categories.find(
    (c) => c.name.toLowerCase() === normalizedInput || c.name.toLowerCase().replace(/[^a-z0-9]+/g, "-") === normalizedInput
  );
  if (nameMatch) {
    return nameMatch.category_id;
  }
  const partialMatch = categories.find(
    (c) => c.name.toLowerCase().includes(normalizedInput) || c.category_id.includes(normalizedInput)
  );
  if (partialMatch) {
    return partialMatch.category_id;
  }
  return void 0;
}
var GetMarketsSchema = z.object({
  vs_currency: z.string().default("usd"),
  category: z.string().optional(),
  order: z.enum(["market_cap_desc", "market_cap_asc", "volume_desc", "volume_asc"]).default("market_cap_desc"),
  per_page: z.number().min(1).max(250).default(20),
  page: z.number().min(1).default(1),
  sparkline: z.boolean().default(false)
});
var isGetMarketsContent = (obj) => {
  return GetMarketsSchema.safeParse(obj).success;
};
var getMarkets_default = {
  name: "GET_MARKETS",
  similes: [
    "MARKET_OVERVIEW",
    "TOP_RANKINGS",
    "MARKET_LEADERBOARD",
    "CRYPTO_RANKINGS",
    "BEST_PERFORMING_COINS",
    "TOP_MARKET_CAPS"
  ],
  // eslint-disable-next-line
  validate: async (runtime, _message) => {
    await validateCoingeckoConfig(runtime);
    return true;
  },
  // Comprehensive endpoint for market rankings, supports up to 250 coins per request
  description: "Get ranked list of top cryptocurrencies sorted by market metrics (without specifying coins)",
  handler: async (runtime, message, state, _options, callback) => {
    elizaLogger2.log("Starting CoinGecko GET_MARKETS handler...");
    let currentState = state;
    if (!currentState) {
      currentState = await runtime.composeState(message);
    } else {
      currentState = await runtime.updateRecentMessageState(currentState);
    }
    try {
      const config = await validateCoingeckoConfig(runtime);
      const { baseUrl, apiKey, headerKey } = getApiConfig(config);
      const categories = await getCategoriesData(runtime);
      const marketsContext = composeContext({
        state: currentState,
        template: getMarketsTemplate.replace(
          "{{categories}}",
          categories.map((c) => `- ${c.name} (ID: ${c.category_id})`).join("\n")
        )
      });
      const result = await generateObject({
        runtime,
        context: marketsContext,
        modelClass: ModelClass.SMALL,
        schema: GetMarketsSchema
      });
      if (!isGetMarketsContent(result.object)) {
        elizaLogger2.error("Invalid market data format received");
        return false;
      }
      const content = result.object;
      elizaLogger2.log("Content from template:", content);
      if (!content) {
        return false;
      }
      const formattedCategory = formatCategory(content.category, categories);
      if (content.category && !formattedCategory) {
        throw new Error(`Invalid category: ${content.category}. Please choose from the available categories.`);
      }
      elizaLogger2.log("Making API request with params:", {
        url: `${baseUrl}/coins/markets`,
        category: formattedCategory,
        vs_currency: content.vs_currency,
        order: content.order,
        per_page: content.per_page,
        page: content.page
      });
      const response = await axios2.get(
        `${baseUrl}/coins/markets`,
        {
          headers: {
            "accept": "application/json",
            [headerKey]: apiKey
          },
          params: {
            vs_currency: content.vs_currency,
            category: formattedCategory,
            order: content.order,
            per_page: content.per_page,
            page: content.page,
            sparkline: content.sparkline
          }
        }
      );
      if (!response.data?.length) {
        throw new Error("No market data received from CoinGecko API");
      }
      const formattedData = response.data.map((coin) => ({
        name: coin.name,
        symbol: coin.symbol.toUpperCase(),
        marketCapRank: coin.market_cap_rank,
        currentPrice: coin.current_price,
        priceChange24h: coin.price_change_24h,
        priceChangePercentage24h: coin.price_change_percentage_24h,
        marketCap: coin.market_cap,
        volume24h: coin.total_volume,
        high24h: coin.high_24h,
        low24h: coin.low_24h,
        circulatingSupply: coin.circulating_supply,
        totalSupply: coin.total_supply,
        maxSupply: coin.max_supply,
        lastUpdated: coin.last_updated
      }));
      const categoryDisplay = content.category ? `${categories.find((c) => c.category_id === formattedCategory)?.name.toUpperCase() || content.category.toUpperCase()} ` : "";
      const responseText = [
        `Top ${formattedData.length} ${categoryDisplay}Cryptocurrencies by ${content.order === "volume_desc" || content.order === "volume_asc" ? "Volume" : "Market Cap"}:`,
        ...formattedData.map(
          (coin, index) => `${index + 1}. ${coin.name} (${coin.symbol}) | $${coin.currentPrice.toLocaleString()} | ${coin.priceChangePercentage24h.toFixed(2)}% | MCap: $${(coin.marketCap / 1e9).toFixed(2)}B`
        )
      ].join("\n");
      elizaLogger2.success("Market data retrieved successfully!");
      if (callback) {
        callback({
          text: responseText,
          content: {
            markets: formattedData,
            params: {
              vs_currency: content.vs_currency,
              category: content.category,
              order: content.order,
              per_page: content.per_page,
              page: content.page
            },
            timestamp: (/* @__PURE__ */ new Date()).toISOString()
          }
        });
      }
      return true;
    } catch (error) {
      elizaLogger2.error("Error in GET_MARKETS handler:", error);
      let errorMessage;
      if (error.response?.status === 429) {
        errorMessage = "Rate limit exceeded. Please try again later.";
      } else if (error.response?.status === 403) {
        errorMessage = "This endpoint requires a CoinGecko Pro API key. Please upgrade your plan to access this data.";
      } else if (error.response?.status === 400) {
        errorMessage = "Invalid request parameters. Please check your input.";
      } else {
        errorMessage = `Error fetching market data: ${error.message}`;
      }
      if (callback) {
        callback({
          text: errorMessage,
          error: {
            message: error.message,
            statusCode: error.response?.status,
            params: error.config?.params,
            requiresProPlan: error.response?.status === 403
          }
        });
      }
      return false;
    }
  },
  examples: [
    [
      {
        user: "{{user1}}",
        content: {
          text: "Show me the top cryptocurrencies by market cap"
        }
      },
      {
        user: "{{agent}}",
        content: {
          text: "I'll fetch the current market data for top cryptocurrencies.",
          action: "GET_MARKETS"
        }
      },
      {
        user: "{{agent}}",
        content: {
          text: "Here are the top cryptocurrencies:\n1. Bitcoin (BTC) | $45,000 | +2.5% | MCap: $870.5B\n{{dynamic}}"
        }
      }
    ]
  ]
};

// src/actions/getPrice.ts
import {
  composeContext as composeContext2,
  elizaLogger as elizaLogger4,
  generateObject as generateObject2,
  ModelClass as ModelClass2
} from "@elizaos/core";
import axios4 from "axios";

// src/providers/coinsProvider.ts
import { elizaLogger as elizaLogger3 } from "@elizaos/core";
import axios3 from "axios";
var CACHE_KEY2 = "coingecko:coins";
var CACHE_TTL2 = 5 * 60;
var MAX_RETRIES2 = 3;
async function fetchCoins(runtime, includePlatform = false) {
  const config = await validateCoingeckoConfig(runtime);
  const { baseUrl, apiKey, headerKey } = getApiConfig(config);
  const response = await axios3.get(
    `${baseUrl}/coins/list`,
    {
      params: {
        include_platform: includePlatform
      },
      headers: {
        "accept": "application/json",
        [headerKey]: apiKey
      },
      timeout: 5e3
      // 5 second timeout
    }
  );
  if (!response.data?.length) {
    throw new Error("Invalid coins data received");
  }
  return response.data;
}
async function fetchWithRetry2(runtime, includePlatform = false) {
  let lastError = null;
  for (let i = 0; i < MAX_RETRIES2; i++) {
    try {
      return await fetchCoins(runtime, includePlatform);
    } catch (error) {
      lastError = error;
      elizaLogger3.error(`Coins fetch attempt ${i + 1} failed:`, error);
      await new Promise((resolve) => setTimeout(resolve, 1e3 * (i + 1)));
    }
  }
  throw lastError || new Error("Failed to fetch coins after multiple attempts");
}
async function getCoins(runtime, includePlatform = false) {
  try {
    const cached = await runtime.cacheManager.get(CACHE_KEY2);
    if (cached) {
      return cached;
    }
    const coins = await fetchWithRetry2(runtime, includePlatform);
    await runtime.cacheManager.set(CACHE_KEY2, coins, { expires: CACHE_TTL2 });
    return coins;
  } catch (error) {
    elizaLogger3.error("Error fetching coins:", error);
    throw error;
  }
}
function formatCoinsContext(coins) {
  const popularCoins = [
    "bitcoin",
    "ethereum",
    "binancecoin",
    "ripple",
    "cardano",
    "solana",
    "polkadot",
    "dogecoin"
  ];
  const popular = coins.filter((c) => popularCoins.includes(c.id)).map((c) => `${c.name} (${c.symbol.toUpperCase()}) - ID: ${c.id}`);
  return `
Available cryptocurrencies:

Popular coins:
${popular.map((c) => `- ${c}`).join("\n")}

Total available coins: ${coins.length}

You can use these coin IDs when querying specific cryptocurrency data.
`.trim();
}
var coinsProvider = {
  // eslint-disable-next-line
  get: async (runtime, message, state) => {
    try {
      const coins = await getCoins(runtime);
      return formatCoinsContext(coins);
    } catch (error) {
      elizaLogger3.error("Coins provider error:", error);
      return "Cryptocurrency list is temporarily unavailable. Please try again later.";
    }
  }
};
async function getCoinsData(runtime, includePlatform = false) {
  return getCoins(runtime, includePlatform);
}

// src/templates/price.ts
var getPriceTemplate = `
Extract the following parameters for cryptocurrency price data:
- **coinIds** (string | string[]): The ID(s) of the cryptocurrency/cryptocurrencies to get prices for (e.g., "bitcoin" or ["bitcoin", "ethereum"])
- **currency** (string | string[]): The currency/currencies to display prices in (e.g., "usd" or ["usd", "eur", "jpy"]) - defaults to ["usd"]
- **include_market_cap** (boolean): Whether to include market cap data - defaults to false
- **include_24hr_vol** (boolean): Whether to include 24h volume data - defaults to false
- **include_24hr_change** (boolean): Whether to include 24h price change data - defaults to false
- **include_last_updated_at** (boolean): Whether to include last update timestamp - defaults to false

Provide the values in the following JSON format:

\`\`\`json
{
    "coinIds": "bitcoin",
    "currency": ["usd"],
    "include_market_cap": false,
    "include_24hr_vol": false,
    "include_24hr_change": false,
    "include_last_updated_at": false
}
\`\`\`

Example request: "What's the current price of Bitcoin?"
Example response:
\`\`\`json
{
    "coinIds": "bitcoin",
    "currency": ["usd"],
    "include_market_cap": false,
    "include_24hr_vol": false,
    "include_24hr_change": false,
    "include_last_updated_at": false
}
\`\`\`

Example request: "Show me ETH price and market cap in EUR with last update time"
Example response:
\`\`\`json
{
    "coinIds": "ethereum",
    "currency": ["eur"],
    "include_market_cap": true,
    "include_24hr_vol": false,
    "include_24hr_change": false,
    "include_last_updated_at": true
}
\`\`\`

Example request: "What's the current price of Bitcoin in USD, JPY and EUR?"
Example response:
\`\`\`json
{
    "coinIds": "bitcoin",
    "currency": ["usd", "jpy", "eur"],
    "include_market_cap": false,
    "include_24hr_vol": false,
    "include_24hr_change": false,
    "include_last_updated_at": false
}
\`\`\`

Here are the recent user messages for context:
{{recentMessages}}

Based on the conversation above, if the request is for cryptocurrency price data, extract the appropriate parameters and respond with a JSON object. If the request is not related to price data, respond with null.`;

// src/actions/getPrice.ts
var GetPriceSchema = z.object({
  coinIds: z.union([z.string(), z.array(z.string())]),
  currency: z.union([z.string(), z.array(z.string())]).default(["usd"]),
  include_market_cap: z.boolean().default(false),
  include_24hr_vol: z.boolean().default(false),
  include_24hr_change: z.boolean().default(false),
  include_last_updated_at: z.boolean().default(false)
});
var isGetPriceContent = (obj) => {
  return GetPriceSchema.safeParse(obj).success;
};
function formatCoinIds(input) {
  if (Array.isArray(input)) {
    return input.join(",");
  }
  return input;
}
var getPrice_default = {
  name: "GET_PRICE",
  similes: [
    "COIN_PRICE_CHECK",
    "SPECIFIC_COINS_PRICE",
    "COIN_PRICE_LOOKUP",
    "SELECTED_COINS_PRICE",
    "PRICE_DETAILS",
    "COIN_PRICE_DATA"
  ],
  // eslint-disable-next-line
  validate: async (runtime, _message) => {
    await validateCoingeckoConfig(runtime);
    return true;
  },
  description: "Get price and basic market data for one or more specific cryptocurrencies (by name/symbol)",
  handler: async (runtime, message, state, _options, callback) => {
    elizaLogger4.log("Starting CoinGecko GET_PRICE handler...");
    let currentState = state;
    if (!currentState) {
      currentState = await runtime.composeState(message);
    } else {
      currentState = await runtime.updateRecentMessageState(currentState);
    }
    try {
      elizaLogger4.log("Composing price context...");
      const priceContext = composeContext2({
        state: currentState,
        template: getPriceTemplate
      });
      elizaLogger4.log("Generating content from template...");
      const result = await generateObject2({
        runtime,
        context: priceContext,
        modelClass: ModelClass2.LARGE,
        schema: GetPriceSchema
      });
      if (!isGetPriceContent(result.object)) {
        elizaLogger4.error("Invalid price request format");
        return false;
      }
      const content = result.object;
      elizaLogger4.log("Generated content:", content);
      const currencies = Array.isArray(content.currency) ? content.currency : [content.currency];
      const vs_currencies = currencies.join(",").toLowerCase();
      const coinIds = formatCoinIds(content.coinIds);
      elizaLogger4.log("Formatted request parameters:", { coinIds, vs_currencies });
      const config = await validateCoingeckoConfig(runtime);
      const { baseUrl, apiKey, headerKey } = getApiConfig(config);
      elizaLogger4.log(`Fetching prices for ${coinIds} in ${vs_currencies}...`);
      elizaLogger4.log("API request URL:", `${baseUrl}/simple/price`);
      elizaLogger4.log("API request params:", {
        ids: coinIds,
        vs_currencies,
        include_market_cap: content.include_market_cap,
        include_24hr_vol: content.include_24hr_vol,
        include_24hr_change: content.include_24hr_change,
        include_last_updated_at: content.include_last_updated_at
      });
      const response = await axios4.get(
        `${baseUrl}/simple/price`,
        {
          params: {
            ids: coinIds,
            vs_currencies,
            include_market_cap: content.include_market_cap,
            include_24hr_vol: content.include_24hr_vol,
            include_24hr_change: content.include_24hr_change,
            include_last_updated_at: content.include_last_updated_at
          },
          headers: {
            "accept": "application/json",
            [headerKey]: apiKey
          }
        }
      );
      if (Object.keys(response.data).length === 0) {
        throw new Error("No price data available for the specified coins and currency");
      }
      const coins = await getCoinsData(runtime);
      const formattedResponse = Object.entries(response.data).map(([coinId, data]) => {
        const coin = coins.find((c) => c.id === coinId);
        const coinName = coin ? `${coin.name} (${coin.symbol.toUpperCase()})` : coinId;
        const parts = [`${coinName}:`];
        for (const currency of currencies) {
          const upperCurrency = currency.toUpperCase();
          if (data[currency]) {
            parts.push(`  ${upperCurrency}: ${data[currency].toLocaleString(void 0, {
              style: "currency",
              currency
            })}`);
          }
          if (content.include_market_cap) {
            const marketCap = data[`${currency}_market_cap`];
            if (marketCap !== void 0) {
              parts.push(`  Market Cap (${upperCurrency}): ${marketCap.toLocaleString(void 0, {
                style: "currency",
                currency,
                maximumFractionDigits: 0
              })}`);
            }
          }
          if (content.include_24hr_vol) {
            const volume = data[`${currency}_24h_vol`];
            if (volume !== void 0) {
              parts.push(`  24h Volume (${upperCurrency}): ${volume.toLocaleString(void 0, {
                style: "currency",
                currency,
                maximumFractionDigits: 0
              })}`);
            }
          }
          if (content.include_24hr_change) {
            const change = data[`${currency}_24h_change`];
            if (change !== void 0) {
              const changePrefix = change >= 0 ? "+" : "";
              parts.push(`  24h Change (${upperCurrency}): ${changePrefix}${change.toFixed(2)}%`);
            }
          }
        }
        if (content.include_last_updated_at && data.last_updated_at) {
          const lastUpdated = new Date(data.last_updated_at * 1e3).toLocaleString();
          parts.push(`  Last Updated: ${lastUpdated}`);
        }
        return parts.join("\n");
      }).filter(Boolean);
      if (formattedResponse.length === 0) {
        throw new Error("Failed to format price data for the specified coins");
      }
      const responseText = formattedResponse.join("\n\n");
      elizaLogger4.success("Price data retrieved successfully!");
      if (callback) {
        callback({
          text: responseText,
          content: {
            prices: Object.entries(response.data).reduce((acc, [coinId, data]) => {
              const coinPrices = currencies.reduce((currencyAcc, currency) => {
                const currencyData = {
                  price: data[currency],
                  marketCap: data[`${currency}_market_cap`],
                  volume24h: data[`${currency}_24h_vol`],
                  change24h: data[`${currency}_24h_change`],
                  lastUpdated: data.last_updated_at
                };
                Object.assign(currencyAcc, { [currency]: currencyData });
                return currencyAcc;
              }, {});
              Object.assign(acc, { [coinId]: coinPrices });
              return acc;
            }, {}),
            params: {
              currencies: currencies.map((c) => c.toUpperCase()),
              include_market_cap: content.include_market_cap,
              include_24hr_vol: content.include_24hr_vol,
              include_24hr_change: content.include_24hr_change,
              include_last_updated_at: content.include_last_updated_at
            }
          }
        });
      }
      return true;
    } catch (error) {
      elizaLogger4.error("Error in GET_PRICE handler:", error);
      let errorMessage;
      if (error.response?.status === 429) {
        errorMessage = "Rate limit exceeded. Please try again later.";
      } else if (error.response?.status === 403) {
        errorMessage = "This endpoint requires a CoinGecko Pro API key. Please upgrade your plan to access this data.";
      } else if (error.response?.status === 400) {
        errorMessage = "Invalid request parameters. Please check your input.";
      }
      if (callback) {
        callback({
          text: errorMessage,
          content: {
            error: error.message,
            statusCode: error.response?.status,
            params: error.config?.params,
            requiresProPlan: error.response?.status === 403
          }
        });
      }
      return false;
    }
  },
  examples: [
    [
      {
        user: "{{user1}}",
        content: {
          text: "What's the current price of Bitcoin?"
        }
      },
      {
        user: "{{agent}}",
        content: {
          text: "I'll check the current Bitcoin price for you.",
          action: "GET_PRICE"
        }
      },
      {
        user: "{{agent}}",
        content: {
          text: "The current price of Bitcoin is {{dynamic}} USD"
        }
      }
    ],
    [
      {
        user: "{{user1}}",
        content: {
          text: "Check ETH and BTC prices in EUR with market cap"
        }
      },
      {
        user: "{{agent}}",
        content: {
          text: "I'll check the current prices with market cap data.",
          action: "GET_PRICE"
        }
      },
      {
        user: "{{agent}}",
        content: {
          text: "Bitcoin: EUR {{dynamic}} | Market Cap: \u20AC{{dynamic}}\nEthereum: EUR {{dynamic}} | Market Cap: \u20AC{{dynamic}}"
        }
      }
    ]
  ]
};

// src/actions/getPricePerAddress.ts
import {
  composeContext as composeContext3,
  elizaLogger as elizaLogger5,
  generateObject as generateObject3,
  ModelClass as ModelClass3
} from "@elizaos/core";
import axios5 from "axios";

// src/templates/priceAddress.ts
var getPriceByAddressTemplate = `
Extract the following parameters for token price data:
- **chainId** (string): The blockchain network ID (e.g., "ethereum", "polygon", "binance-smart-chain")
- **tokenAddress** (string): The contract address of the token
- **include_market_cap** (boolean): Whether to include market cap data - defaults to true

Normalize chain IDs to lowercase names: ethereum, polygon, binance-smart-chain, avalanche, fantom, arbitrum, optimism, etc.
Token address should be the complete address string, maintaining its original case.

Provide the values in the following JSON format:

\`\`\`json
{
    "chainId": "ethereum",
    "tokenAddress": "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48",
    "include_market_cap": true
}
\`\`\`

Example request: "What's the price of USDC on Ethereum? Address: 0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48"
Example response:
\`\`\`json
{
    "chainId": "ethereum",
    "tokenAddress": "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48",
    "include_market_cap": true
}
\`\`\`

Example request: "Check the price for this token on Polygon: 0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174"
Example response:
\`\`\`json
{
    "chainId": "polygon",
    "tokenAddress": "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174",
    "include_market_cap": true
}
\`\`\`

Example request: "Get price for BONK token on Solana with address HeLp6NuQkmYB4pYWo2zYs22mESHXPQYzXbB8n4V98jwC"
Example response:
\`\`\`json
{
    "chainId": "solana",
    "tokenAddress": "HeLp6NuQkmYB4pYWo2zYs22mESHXPQYzXbB8n4V98jwC"
}
\`\`\`

Here are the recent user messages for context:
{{recentMessages}}

Based on the conversation above, use last question made and if the request is for token price data and includes both a chain and address, extract the appropriate parameters and respond with a JSON object. If the request is not related to token price data or missing required information, respond with null.`;

// src/actions/getPricePerAddress.ts
var GetTokenPriceSchema = z.object({
  chainId: z.string(),
  tokenAddress: z.string()
});
var isGetTokenPriceContent = (obj) => {
  return GetTokenPriceSchema.safeParse(obj).success;
};
var getPricePerAddress_default = {
  name: "GET_TOKEN_PRICE_BY_ADDRESS",
  similes: [
    "FETCH_TOKEN_PRICE_BY_ADDRESS",
    "CHECK_TOKEN_PRICE_BY_ADDRESS",
    "LOOKUP_TOKEN_BY_ADDRESS"
  ],
  // eslint-disable-next-line
  validate: async (runtime, _message) => {
    await validateCoingeckoConfig(runtime);
    return true;
  },
  description: "Get the current USD price for a token using its blockchain address",
  handler: async (runtime, message, state, _options, callback) => {
    elizaLogger5.log("Starting GET_TOKEN_PRICE_BY_ADDRESS handler...");
    let currentState = state;
    if (!currentState) {
      currentState = await runtime.composeState(message);
    } else {
      currentState = await runtime.updateRecentMessageState(currentState);
    }
    try {
      elizaLogger5.log("Composing token price context...");
      const context = composeContext3({
        state: currentState,
        template: getPriceByAddressTemplate
      });
      elizaLogger5.log("Generating content from template...");
      const result = await generateObject3({
        runtime,
        context,
        modelClass: ModelClass3.SMALL,
        schema: GetTokenPriceSchema
      });
      if (!isGetTokenPriceContent(result.object)) {
        elizaLogger5.error("Invalid token price request format");
        return false;
      }
      const content = result.object;
      elizaLogger5.log("Generated content:", content);
      const config = await validateCoingeckoConfig(runtime);
      const { baseUrl, apiKey, headerKey } = getApiConfig(config);
      elizaLogger5.log("Fetching token data...");
      const response = await axios5.get(
        `${baseUrl}/coins/${content.chainId}/contract/${content.tokenAddress}`,
        {
          headers: {
            accept: "application/json",
            [headerKey]: apiKey
          }
        }
      );
      const tokenData = response.data;
      if (!tokenData.market_data?.current_price?.usd) {
        throw new Error(
          `No price data available for token ${content.tokenAddress} on ${content.chainId}`
        );
      }
      const parts = [
        `${tokenData.name} (${tokenData.symbol.toUpperCase()})`,
        `Address: ${content.tokenAddress}`,
        `Chain: ${content.chainId}`,
        `Price: $${tokenData.market_data.current_price.usd.toFixed(6)} USD`
      ];
      if (tokenData.market_data.market_cap?.usd) {
        parts.push(
          `Market Cap: $${tokenData.market_data.market_cap.usd.toLocaleString()} USD`
        );
      }
      const responseText = parts.join("\n");
      elizaLogger5.success("Token price data retrieved successfully!");
      if (callback) {
        callback({
          text: responseText,
          content: {
            token: {
              name: tokenData.name,
              symbol: tokenData.symbol,
              address: content.tokenAddress,
              chain: content.chainId,
              price: tokenData.market_data.current_price.usd,
              marketCap: tokenData.market_data.market_cap?.usd
            }
          }
        });
      }
      return true;
    } catch (error) {
      elizaLogger5.error(
        "Error in GET_TOKEN_PRICE_BY_ADDRESS handler:",
        error
      );
      let errorMessage;
      if (error.response?.status === 429) {
        errorMessage = "Rate limit exceeded. Please try again later.";
      } else if (error.response?.status === 403) {
        errorMessage = "This endpoint requires a CoinGecko Pro API key. Please upgrade your plan to access this data.";
      } else if (error.response?.status === 400) {
        errorMessage = "Invalid request parameters. Please check your input.";
      } else {
        errorMessage = "Failed to fetch token price. Please try again later.";
      }
      if (callback) {
        callback({
          text: errorMessage,
          content: {
            error: error.message,
            statusCode: error.response?.status,
            requiresProPlan: error.response?.status === 403
          }
        });
      }
      return false;
    }
  },
  examples: [
    [
      {
        user: "{{user1}}",
        content: {
          text: "What's the price of the USDC token on Ethereum? The address is 0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48"
        }
      },
      {
        user: "{{agent}}",
        content: {
          text: "I'll check the USDC token price for you.",
          action: "GET_TOKEN_PRICE_BY_ADDRESS"
        }
      },
      {
        user: "{{agent}}",
        content: {
          text: "USD Coin (USDC)\nAddress: 0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48\nChain: ethereum\nPrice: {{dynamic}} USD\nMarket Cap: ${{dynamic}} USD"
        }
      }
    ]
  ]
};

// src/actions/getTopGainersLosers.ts
import {
  composeContext as composeContext4,
  elizaLogger as elizaLogger6,
  generateObject as generateObject4,
  ModelClass as ModelClass4
} from "@elizaos/core";
import axios6 from "axios";

// src/templates/gainersLosers.ts
var getTopGainersLosersTemplate = `
Extract the following parameters for top gainers and losers data:
- **vs_currency** (string): The target currency to display prices in (e.g., "usd", "eur") - defaults to "usd"
- **duration** (string): Time range for price changes - one of "24h", "7d", "14d", "30d", "60d", "1y" - defaults to "24h"
- **top_coins** (string): Filter by market cap ranking (e.g., "100", "1000") - defaults to "1000"

Provide the values in the following JSON format:

\`\`\`json
{
    "vs_currency": "usd",
    "duration": "24h",
    "top_coins": "1000"
}
\`\`\`

Example request: "Show me the biggest gainers and losers today"
Example response:
\`\`\`json
{
    "vs_currency": "usd",
    "duration": "24h",
    "top_coins": "1000"
}
\`\`\`

Example request: "What are the top movers in EUR for the past week?"
Example response:
\`\`\`json
{
    "vs_currency": "eur",
    "duration": "7d",
    "top_coins": "300"
}
\`\`\`

Example request: "Show me monthly performance of top 100 coins"
Example response:
\`\`\`json
{
    "vs_currency": "usd",
    "duration": "30d",
    "top_coins": "100"
}
\`\`\`

Here are the recent user messages for context:
{{recentMessages}}

Based on the conversation above, if the request is for top gainers and losers data, extract the appropriate parameters and respond with a JSON object. If the request is not related to top movers data, respond with null.`;

// src/actions/getTopGainersLosers.ts
var DurationEnum = z.enum(["1h", "24h", "7d", "14d", "30d", "60d", "1y"]);
var GetTopGainersLosersSchema = z.object({
  vs_currency: z.string().default("usd"),
  duration: DurationEnum.default("24h"),
  top_coins: z.string().default("1000")
});
var isGetTopGainersLosersContent = (obj) => {
  return GetTopGainersLosersSchema.safeParse(obj).success;
};
var getTopGainersLosers_default = {
  name: "GET_TOP_GAINERS_LOSERS",
  similes: [
    "TOP_MOVERS",
    "BIGGEST_GAINERS",
    "BIGGEST_LOSERS",
    "PRICE_CHANGES",
    "BEST_WORST_PERFORMERS"
  ],
  // eslint-disable-next-line
  validate: async (runtime, _message) => {
    await validateCoingeckoConfig(runtime);
    return true;
  },
  description: "Get list of top gaining and losing cryptocurrencies by price change",
  handler: async (runtime, message, state, _options, callback) => {
    elizaLogger6.log("Starting CoinGecko GET_TOP_GAINERS_LOSERS handler...");
    let currentState = state;
    if (!currentState) {
      currentState = await runtime.composeState(message);
    } else {
      currentState = await runtime.updateRecentMessageState(currentState);
    }
    try {
      elizaLogger6.log("Composing gainers/losers context...");
      const context = composeContext4({
        state: currentState,
        template: getTopGainersLosersTemplate
      });
      elizaLogger6.log("Generating content from template...");
      const result = await generateObject4({
        runtime,
        context,
        modelClass: ModelClass4.LARGE,
        schema: GetTopGainersLosersSchema
      });
      if (!isGetTopGainersLosersContent(result.object)) {
        elizaLogger6.error("Invalid gainers/losers request format");
        return false;
      }
      const content = result.object;
      elizaLogger6.log("Generated content:", content);
      const config = await validateCoingeckoConfig(runtime);
      const { baseUrl, apiKey, headerKey } = getApiConfig(config);
      elizaLogger6.log("Fetching top gainers/losers data...");
      elizaLogger6.log("API request params:", {
        vs_currency: content.vs_currency,
        duration: content.duration,
        top_coins: content.top_coins
      });
      const response = await axios6.get(
        `${baseUrl}/coins/top_gainers_losers`,
        {
          headers: {
            "accept": "application/json",
            [headerKey]: apiKey
          },
          params: {
            vs_currency: content.vs_currency,
            duration: content.duration,
            top_coins: content.top_coins
          }
        }
      );
      if (!response.data) {
        throw new Error("No data received from CoinGecko API");
      }
      const responseText = [
        "Top Gainers:",
        ...response.data.top_gainers.map((coin, index) => {
          const changeKey = `usd_${content.duration}_change`;
          const change = coin[changeKey];
          return `${index + 1}. ${coin.name} (${coin.symbol.toUpperCase()}) | $${coin.usd.toLocaleString(void 0, { minimumFractionDigits: 2, maximumFractionDigits: 8 })} | ${change >= 0 ? "+" : ""}${change.toFixed(2)}%${coin.market_cap_rank ? ` | Rank #${coin.market_cap_rank}` : ""}`;
        }),
        "",
        "Top Losers:",
        ...response.data.top_losers.map((coin, index) => {
          const changeKey = `usd_${content.duration}_change`;
          const change = coin[changeKey];
          return `${index + 1}. ${coin.name} (${coin.symbol.toUpperCase()}) | $${coin.usd.toLocaleString(void 0, { minimumFractionDigits: 2, maximumFractionDigits: 8 })} | ${change >= 0 ? "+" : ""}${change.toFixed(2)}%${coin.market_cap_rank ? ` | Rank #${coin.market_cap_rank}` : ""}`;
        })
      ].join("\n");
      if (callback) {
        callback({
          text: responseText,
          content: {
            data: response.data,
            params: {
              vs_currency: content.vs_currency,
              duration: content.duration,
              top_coins: content.top_coins
            }
          }
        });
      }
      return true;
    } catch (error) {
      elizaLogger6.error("Error in GET_TOP_GAINERS_LOSERS handler:", error);
      let errorMessage;
      if (error.response?.status === 429) {
        errorMessage = "Rate limit exceeded. Please try again later.";
      } else if (error.response?.status === 403) {
        errorMessage = "This endpoint requires a CoinGecko Pro API key. Please upgrade your plan to access this data.";
      } else if (error.response?.status === 400) {
        errorMessage = "Invalid request parameters. Please check your input.";
      } else {
        errorMessage = `Error fetching top gainers/losers data: ${error.message}`;
      }
      if (callback) {
        callback({
          text: errorMessage,
          content: {
            error: error.message,
            statusCode: error.response?.status,
            params: error.config?.params,
            requiresProPlan: error.response?.status === 403
          }
        });
      }
      return false;
    }
  },
  examples: [
    [
      {
        user: "{{user1}}",
        content: {
          text: "What are the top gaining and losing cryptocurrencies?"
        }
      },
      {
        user: "{{agent}}",
        content: {
          text: "I'll check the top gainers and losers for you.",
          action: "GET_TOP_GAINERS_LOSERS"
        }
      },
      {
        user: "{{agent}}",
        content: {
          text: "Here are the top gainers and losers:\nTop Gainers:\n1. Bitcoin (BTC) | $45,000 | +5.2% | Rank #1\n{{dynamic}}"
        }
      }
    ],
    [
      {
        user: "{{user1}}",
        content: {
          text: "Show me the best and worst performing crypto today"
        }
      },
      {
        user: "{{agent}}",
        content: {
          text: "I'll fetch the current top movers in the crypto market.",
          action: "GET_TOP_GAINERS_LOSERS"
        }
      },
      {
        user: "{{agent}}",
        content: {
          text: "Here are today's best and worst performers:\n{{dynamic}}"
        }
      }
    ]
  ]
};

// src/actions/getTrending.ts
import {
  composeContext as composeContext5,
  elizaLogger as elizaLogger7,
  generateObject as generateObject5,
  ModelClass as ModelClass5
} from "@elizaos/core";
import axios7 from "axios";

// src/templates/trending.ts
var getTrendingTemplate = `
Extract the following parameters for trending data:
- **include_nfts** (boolean): Whether to include NFTs in the response (default: true)
- **include_categories** (boolean): Whether to include categories in the response (default: true)

Provide the values in the following JSON format:

\`\`\`json
{
    "include_nfts": true,
    "include_categories": true
}
\`\`\`

Example request: "What's trending in crypto?"
Example response:
\`\`\`json
{
    "include_nfts": true,
    "include_categories": true
}
\`\`\`

Example request: "Show me trending coins only"
Example response:
\`\`\`json
{
    "include_nfts": false,
    "include_categories": false
}
\`\`\`

Here are the recent user messages for context:
{{recentMessages}}

Based on the conversation above, if the request is for trending market data, extract the appropriate parameters and respond with a JSON object. If the request is not related to trending data, respond with null.`;

// src/actions/getTrending.ts
var GetTrendingSchema = z.object({
  include_nfts: z.boolean().default(true),
  include_categories: z.boolean().default(true)
});
var isGetTrendingContent = (obj) => {
  return GetTrendingSchema.safeParse(obj).success;
};
var getTrending_default = {
  name: "GET_TRENDING",
  similes: [
    "TRENDING_COINS",
    "TRENDING_CRYPTO",
    "HOT_COINS",
    "POPULAR_COINS",
    "TRENDING_SEARCH"
  ],
  // eslint-disable-next-line
  validate: async (runtime, _message) => {
    await validateCoingeckoConfig(runtime);
    return true;
  },
  description: "Get list of trending cryptocurrencies, NFTs, and categories from CoinGecko",
  handler: async (runtime, message, state, _options, callback) => {
    elizaLogger7.log("Starting CoinGecko GET_TRENDING handler...");
    let currentState = state;
    if (!currentState) {
      currentState = await runtime.composeState(message);
    } else {
      currentState = await runtime.updateRecentMessageState(currentState);
    }
    try {
      elizaLogger7.log("Composing trending context...");
      const trendingContext = composeContext5({
        state: currentState,
        template: getTrendingTemplate
      });
      const result = await generateObject5({
        runtime,
        context: trendingContext,
        modelClass: ModelClass5.LARGE,
        schema: GetTrendingSchema
      });
      if (!isGetTrendingContent(result.object)) {
        elizaLogger7.error("Invalid trending request format");
        return false;
      }
      const config = await validateCoingeckoConfig(runtime);
      const { baseUrl, apiKey, headerKey } = getApiConfig(config);
      elizaLogger7.log("Fetching trending data...");
      const response = await axios7.get(
        `${baseUrl}/search/trending`,
        {
          headers: {
            [headerKey]: apiKey
          }
        }
      );
      if (!response.data) {
        throw new Error("No data received from CoinGecko API");
      }
      const formattedData = {
        coins: response.data.coins.map(({ item }) => ({
          name: item.name,
          symbol: item.symbol.toUpperCase(),
          marketCapRank: item.market_cap_rank,
          id: item.id,
          thumbnail: item.thumb,
          largeImage: item.large
        })),
        nfts: response.data.nfts.map((nft) => ({
          name: nft.name,
          symbol: nft.symbol,
          id: nft.id,
          thumbnail: nft.thumb
        })),
        categories: response.data.categories.map((category) => ({
          name: category.name,
          id: category.id
        }))
      };
      const responseText = [
        "Trending Coins:",
        ...formattedData.coins.map(
          (coin, index) => `${index + 1}. ${coin.name} (${coin.symbol})${coin.marketCapRank ? ` - Rank #${coin.marketCapRank}` : ""}`
        ),
        "",
        "Trending NFTs:",
        ...formattedData.nfts.length ? formattedData.nfts.map((nft, index) => `${index + 1}. ${nft.name} (${nft.symbol})`) : ["No trending NFTs available"],
        "",
        "Trending Categories:",
        ...formattedData.categories.length ? formattedData.categories.map((category, index) => `${index + 1}. ${category.name}`) : ["No trending categories available"]
      ].join("\n");
      elizaLogger7.success("Trending data retrieved successfully!");
      if (callback) {
        callback({
          text: responseText,
          content: {
            trending: formattedData,
            timestamp: (/* @__PURE__ */ new Date()).toISOString()
          }
        });
      }
      return true;
    } catch (error) {
      elizaLogger7.error("Error in GET_TRENDING handler:", error);
      const errorMessage = error.response?.status === 429 ? "Rate limit exceeded. Please try again later." : `Error fetching trending data: ${error.message}`;
      if (callback) {
        callback({
          text: errorMessage,
          content: {
            error: error.message,
            statusCode: error.response?.status
          }
        });
      }
      return false;
    }
  },
  examples: [
    [
      {
        user: "{{user1}}",
        content: {
          text: "What are the trending cryptocurrencies?"
        }
      },
      {
        user: "{{agent}}",
        content: {
          text: "I'll check the trending cryptocurrencies for you.",
          action: "GET_TRENDING"
        }
      },
      {
        user: "{{agent}}",
        content: {
          text: "Here are the trending cryptocurrencies:\n1. Bitcoin (BTC) - Rank #1\n2. Ethereum (ETH) - Rank #2\n{{dynamic}}"
        }
      }
    ],
    [
      {
        user: "{{user1}}",
        content: {
          text: "Show me what's hot in crypto right now"
        }
      },
      {
        user: "{{agent}}",
        content: {
          text: "I'll fetch the current trending cryptocurrencies.",
          action: "GET_TRENDING"
        }
      },
      {
        user: "{{agent}}",
        content: {
          text: "Here are the trending cryptocurrencies:\n{{dynamic}}"
        }
      }
    ]
  ]
};

// src/actions/getTrendingPools.ts
import {
  composeContext as composeContext6,
  elizaLogger as elizaLogger8,
  generateObject as generateObject6,
  ModelClass as ModelClass6
} from "@elizaos/core";
import axios8 from "axios";

// src/templates/trendingPools.ts
var getTrendingPoolsTemplate = `Determine if this is a trending pools request. If it is one of the specified situations, perform the corresponding action:

Situation 1: "Get all trending pools"
- Message contains: phrases like "all trending pools", "show all pools", "list all pools"
- Example: "Show me all trending pools" or "List all pools"
- Action: Return with limit=100

Situation 2: "Get specific number of pools"
- Message contains: number followed by "pools" or "top" followed by number and "pools"
- Example: "Show top 5 pools" or "Get me 20 trending pools"
- Action: Return with limit=specified number

Situation 3: "Default trending pools request"
- Message contains: general phrases like "trending pools", "hot pools", "popular pools"
- Example: "What are the trending pools?" or "Show me hot pools"
- Action: Return with limit=10

For all situations, respond with a JSON object in the format:
\`\`\`json
{
    "limit": number
}
\`\`\`

Previous conversation for context:
{{conversation}}

You are replying to: {{message}}
`;

// src/actions/getTrendingPools.ts
var GetTrendingPoolsSchema = z.object({
  limit: z.number().min(1).max(100).default(10)
});
var isGetTrendingPoolsContent = (obj) => {
  return GetTrendingPoolsSchema.safeParse(obj).success;
};
var getTrendingPools_default = {
  name: "GET_TRENDING_POOLS",
  similes: ["TRENDING_POOLS", "HOT_POOLS", "POPULAR_POOLS", "TOP_POOLS"],
  validate: async (runtime, _message) => {
    await validateCoingeckoConfig(runtime);
    return true;
  },
  description: "Get list of trending pools from CoinGecko's onchain data",
  handler: async (runtime, message, state, _options, callback) => {
    elizaLogger8.log("Starting CoinGecko GET_TRENDING_POOLS handler...");
    let currentState = state;
    if (!currentState) {
      currentState = await runtime.composeState(message);
    } else {
      currentState = await runtime.updateRecentMessageState(currentState);
    }
    try {
      elizaLogger8.log("Composing trending pools context...");
      const trendingContext = composeContext6({
        state: currentState,
        template: getTrendingPoolsTemplate
      });
      const result = await generateObject6({
        runtime,
        context: trendingContext,
        modelClass: ModelClass6.LARGE,
        schema: GetTrendingPoolsSchema
      });
      if (!isGetTrendingPoolsContent(result.object)) {
        elizaLogger8.error("Invalid trending pools request format");
        return false;
      }
      const config = await validateCoingeckoConfig(runtime);
      const { baseUrl, apiKey, headerKey } = getApiConfig(config);
      elizaLogger8.log("Fetching trending pools data...");
      const response = await axios8.get(
        `${baseUrl}/onchain/networks/trending_pools?include=base_token,dex`,
        {
          headers: {
            [headerKey]: apiKey
          }
        }
      );
      if (!response.data) {
        throw new Error("No data received from CoinGecko API");
      }
      const formattedData = response.data.data.map((pool) => ({
        name: pool.attributes.name,
        marketCap: Number(
          pool.attributes.market_cap_usd
        ).toLocaleString("en-US", {
          style: "currency",
          currency: "USD"
        }),
        fdv: Number(pool.attributes.fdv_usd).toLocaleString("en-US", {
          style: "currency",
          currency: "USD"
        }),
        reserveUSD: Number(
          pool.attributes.reserve_in_usd
        ).toLocaleString("en-US", {
          style: "currency",
          currency: "USD"
        }),
        createdAt: new Date(
          pool.attributes.pool_created_at
        ).toLocaleDateString()
      }));
      const responseText = [
        "Trending Pools Overview:",
        "",
        ...formattedData.map(
          (pool, index) => [
            `${index + 1}. ${pool.name}`,
            `   Market Cap: ${pool.marketCap}`,
            `   FDV: ${pool.fdv}`,
            `   Reserve: ${pool.reserveUSD}`,
            `   Created: ${pool.createdAt}`,
            ""
          ].join("\n")
        )
      ].join("\n");
      elizaLogger8.success("Trending pools data retrieved successfully!");
      if (callback) {
        callback({
          text: responseText,
          content: {
            trendingPools: formattedData,
            timestamp: (/* @__PURE__ */ new Date()).toISOString()
          }
        });
      }
      return true;
    } catch (error) {
      elizaLogger8.error("Error in GET_TRENDING_POOLS handler:", error);
      const errorMessage = error.response?.status === 429 ? "Rate limit exceeded. Please try again later." : `Error fetching trending pools data: ${error.message}`;
      if (callback) {
        callback({
          text: errorMessage,
          content: {
            error: error.message,
            statusCode: error.response?.status
          }
        });
      }
      return false;
    }
  },
  examples: [
    [
      {
        user: "{{user1}}",
        content: {
          text: "Show me trending liquidity pools"
        }
      },
      {
        user: "{{agent}}",
        content: {
          text: "I'll check the trending liquidity pools for you.",
          action: "GET_TRENDING_POOLS"
        }
      },
      {
        user: "{{agent}}",
        content: {
          text: "Here are the trending liquidity pools:\n1. MELANIA / USDC\n   Market Cap: $954,636,707\n   FDV: $6,402,478,508\n   Reserve: $363,641,037\n   Created: 1/19/2025\n2. TRUMP / USDC\n   Market Cap: $8,844,297,825\n   FDV: $43,874,068,484\n   Reserve: $718,413,745\n   Created: 1/17/2025"
        }
      }
    ],
    [
      {
        user: "{{user1}}",
        content: {
          text: "What are the top hottest dex pools?"
        }
      },
      {
        user: "{{agent}}",
        content: {
          text: "I'll fetch the top hottest DEX pools for you.",
          action: "GET_TRENDING_POOLS"
        }
      },
      {
        user: "{{agent}}",
        content: {
          text: "Here are the top 5 hottest DEX pools:\n1. TRUMP / USDC\n   Market Cap: $8,844,297,825\n   FDV: $43,874,068,484\n   Reserve: $718,413,745\n   Created: 1/17/2025\n2. MELANIA / USDC\n   Market Cap: $954,636,707\n   FDV: $6,402,478,508\n   Reserve: $363,641,037\n   Created: 1/19/2025"
        }
      }
    ],
    [
      {
        user: "{{user1}}",
        content: {
          text: "List all trading pools with highest volume"
        }
      },
      {
        user: "{{agent}}",
        content: {
          text: "I'll get all the trending trading pools for you.",
          action: "GET_TRENDING_POOLS"
        }
      },
      {
        user: "{{agent}}",
        content: {
          text: "Here are all trending trading pools:\n1. MELANIA / USDC\n   Market Cap: $954,636,707\n   FDV: $6,402,478,508\n   Reserve: $363,641,037\n   Created: 1/19/2025\n2. TRUMP / USDC\n   Market Cap: $8,844,297,825\n   FDV: $43,874,068,484\n   Reserve: $718,413,745\n   Created: 1/17/2025"
        }
      }
    ]
  ]
};

// src/actions/getNewlyListed.ts
import {
  composeContext as composeContext7,
  elizaLogger as elizaLogger9,
  generateObject as generateObject7,
  ModelClass as ModelClass7
} from "@elizaos/core";
import axios9 from "axios";

// src/templates/newCoins.ts
var getNewCoinsTemplate = `Determine if this is a new coins request. If it is one of the specified situations, perform the corresponding action:

Situation 1: "Get all new coins"
- Message contains: phrases like "all new coins", "all recent listings", "all latest coins"
- Example: "Show me all new coin listings" or "List all recently added coins"
- Action: Return with limit=50

Situation 2: "Get specific number of new coins"
- Message contains: number followed by "new coins" or "latest" followed by number and "coins"
- Example: "Show me 5 new coins" or "Get the latest 20 coins"
- Action: Return with limit=specified number

Situation 3: "Default new coins request"
- Message contains: general phrases like "new coins", "recent listings", "latest coins"
- Example: "What are the newest coins?" or "Show me recent listings"
- Action: Return with limit=10

For all situations, respond with a JSON object in the format:
\`\`\`json
{
    "limit": number
}
\`\`\`

Previous conversation for context:
{{conversation}}

You are replying to: {{message}}
`;

// src/actions/getNewlyListed.ts
var GetNewCoinsSchema = z.object({
  limit: z.number().min(1).max(50).default(10)
});
var isGetNewCoinsContent = (obj) => {
  return GetNewCoinsSchema.safeParse(obj).success;
};
var getNewlyListed_default = {
  name: "GET_NEW_COINS",
  similes: [
    "NEW_COINS",
    "RECENTLY_ADDED",
    "NEW_LISTINGS",
    "LATEST_COINS"
  ],
  validate: async (runtime, _message) => {
    await validateCoingeckoConfig(runtime);
    return true;
  },
  description: "Get list of recently added coins from CoinGecko",
  handler: async (runtime, message, state, _options, callback) => {
    elizaLogger9.log("Starting CoinGecko GET_NEW_COINS handler...");
    let currentState = state;
    if (!currentState) {
      currentState = await runtime.composeState(message);
    } else {
      currentState = await runtime.updateRecentMessageState(currentState);
    }
    try {
      elizaLogger9.log("Composing new coins context...");
      const newCoinsContext = composeContext7({
        state: currentState,
        template: getNewCoinsTemplate
      });
      const result = await generateObject7({
        runtime,
        context: newCoinsContext,
        modelClass: ModelClass7.LARGE,
        schema: GetNewCoinsSchema
      });
      if (!isGetNewCoinsContent(result.object)) {
        elizaLogger9.error("Invalid new coins request format");
        return false;
      }
      const config = await validateCoingeckoConfig(runtime);
      const { baseUrl, apiKey, headerKey } = getApiConfig(config);
      elizaLogger9.log("Fetching new coins data...");
      const response = await axios9.get(
        `${baseUrl}/coins/list/new`,
        {
          headers: {
            [headerKey]: apiKey
          }
        }
      );
      if (!response.data) {
        throw new Error("No data received from CoinGecko API");
      }
      const formattedData = response.data.slice(0, result.object.limit).map((coin) => ({
        name: coin.name,
        symbol: coin.symbol.toUpperCase(),
        activatedAt: new Date(coin.activated_at * 1e3).toLocaleString("en-US", {
          year: "numeric",
          month: "long",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit"
        })
      }));
      const responseText = [
        "Recently Added Coins:",
        "",
        ...formattedData.map(
          (coin, index) => `${index + 1}. ${coin.name} (${coin.symbol})
   Listed: ${coin.activatedAt}`
        )
      ].join("\n");
      elizaLogger9.success("New coins data retrieved successfully!");
      if (callback) {
        callback({
          text: responseText,
          content: {
            newCoins: formattedData,
            timestamp: (/* @__PURE__ */ new Date()).toISOString()
          }
        });
      }
      return true;
    } catch (error) {
      elizaLogger9.error("Error in GET_NEW_COINS handler:", error);
      const errorMessage = error.response?.status === 429 ? "Rate limit exceeded. Please try again later." : `Error fetching new coins data: ${error.message}`;
      if (callback) {
        callback({
          text: errorMessage,
          content: {
            error: error.message,
            statusCode: error.response?.status
          }
        });
      }
      return false;
    }
  },
  examples: [
    [
      {
        user: "{{user1}}",
        content: {
          text: "What are the newest coins listed?"
        }
      },
      {
        user: "{{agent}}",
        content: {
          text: "I'll check the recently added coins for you.",
          action: "GET_NEW_COINS"
        }
      },
      {
        user: "{{agent}}",
        content: {
          text: "Here are the recently added coins:\n1. Verb Ai (VERB)\n   Listed: January 20, 2025, 12:31 PM\n{{dynamic}}"
        }
      }
    ]
  ]
};

// src/actions/getNetworkTrendingPools.ts
import {
  composeContext as composeContext8,
  elizaLogger as elizaLogger11,
  generateObject as generateObject8,
  ModelClass as ModelClass8
} from "@elizaos/core";
import axios11 from "axios";

// src/templates/networkTrendingPools.ts
var getNetworkTrendingPoolsTemplate = `Determine if this is a network-specific trending pools request. If it is one of the specified situations, extract the network ID and limit:

Situation 1: "Get network trending pools"
- Message contains: network name (e.g., "solana", "ethereum", "bsc") AND phrases about pools
- Example: "Show trending pools on Solana" or "What are the hot pools on ETH?"
- Action: Extract network ID and use default limit

Situation 2: "Get specific number of network pools"
- Message contains: number AND network name AND pools reference
- Example: "Show top 5 pools on BSC" or "Get 20 trending pools on Ethereum"
- Action: Extract network ID and specific limit

Situation 3: "Get all network pools"
- Message contains: "all" AND network name AND pools reference
- Example: "Show all trending pools on Polygon" or "List all hot pools on Avalanche"
- Action: Extract network ID and set maximum limit

Network ID mappings:
- "solana", "sol" => "solana"
- "ethereum", "eth" => "eth"
- "binance smart chain", "bsc", "bnb chain" => "bsc"
- "polygon", "matic" => "polygon_pos"
- "avalanche", "avax" => "avax"

For all situations, respond with a JSON object in the format:
\`\`\`json
{
    "networkId": string,
    "limit": number
}
\`\`\`

Previous conversation for context:
{{conversation}}

You are replying to: {{message}}
`;

// src/providers/networkProvider.ts
import {
  elizaLogger as elizaLogger10
} from "@elizaos/core";
import axios10 from "axios";
var CACHE_KEY3 = "coingecko:networks";
var CACHE_TTL3 = 30 * 60;
var MAX_RETRIES3 = 3;
async function fetchNetworks(runtime) {
  const config = await validateCoingeckoConfig(runtime);
  const { baseUrl, apiKey, headerKey } = getApiConfig(config);
  const response = await axios10.get(
    `${baseUrl}/onchain/networks`,
    {
      headers: {
        accept: "application/json",
        [headerKey]: apiKey
      },
      timeout: 5e3
      // 5 second timeout
    }
  );
  if (!response.data?.data?.length) {
    throw new Error("Invalid networks data received");
  }
  return response.data.data;
}
async function fetchWithRetry3(runtime) {
  let lastError = null;
  for (let i = 0; i < MAX_RETRIES3; i++) {
    try {
      return await fetchNetworks(runtime);
    } catch (error) {
      lastError = error;
      elizaLogger10.error(`Networks fetch attempt ${i + 1} failed:`, error);
      await new Promise((resolve) => setTimeout(resolve, 1e3 * (i + 1)));
    }
  }
  throw lastError || new Error("Failed to fetch networks after multiple attempts");
}
async function getNetworks(runtime) {
  try {
    const cached = await runtime.cacheManager.get(CACHE_KEY3);
    if (cached) {
      return cached;
    }
    const networks = await fetchWithRetry3(runtime);
    await runtime.cacheManager.set(CACHE_KEY3, networks, {
      expires: CACHE_TTL3
    });
    return networks;
  } catch (error) {
    elizaLogger10.error("Error fetching networks:", error);
    throw error;
  }
}
function formatNetworksContext(networks) {
  const mainNetworks = ["eth", "bsc", "polygon_pos", "avax", "solana"];
  const popular = networks.filter((n) => mainNetworks.includes(n.id)).map((n) => `${n.attributes.name} - ID: ${n.id}`);
  return `
Available blockchain networks:

Major networks:
${popular.map((n) => `- ${n}`).join("\n")}

Total available networks: ${networks.length}

You can use these network IDs when querying network-specific data.
`.trim();
}
var networksProvider = {
  // eslint-disable-next-line
  get: async (runtime, message, state) => {
    try {
      const networks = await getNetworks(runtime);
      return formatNetworksContext(networks);
    } catch (error) {
      elizaLogger10.error("Networks provider error:", error);
      return "Blockchain networks list is temporarily unavailable. Please try again later.";
    }
  }
};
async function getNetworksData(runtime) {
  return getNetworks(runtime);
}

// src/actions/getNetworkTrendingPools.ts
var GetNetworkTrendingPoolsSchema = z.object({
  networkId: z.string(),
  limit: z.number().min(1).max(100).default(10)
});
var isGetNetworkTrendingPoolsContent = (obj) => {
  return GetNetworkTrendingPoolsSchema.safeParse(obj).success;
};
var getNetworkTrendingPools_default = {
  name: "GET_NETWORK_TRENDING_POOLS",
  similes: [
    "NETWORK_TRENDING_POOLS",
    "CHAIN_HOT_POOLS",
    "BLOCKCHAIN_POPULAR_POOLS"
  ],
  validate: async (runtime, _message) => {
    await validateCoingeckoConfig(runtime);
    return true;
  },
  description: "Get list of trending pools for a specific network from CoinGecko's onchain data",
  handler: async (runtime, message, state, _options, callback) => {
    elizaLogger11.log(
      "Starting CoinGecko GET_NETWORK_TRENDING_POOLS handler..."
    );
    let currentState = state;
    if (!currentState) {
      currentState = await runtime.composeState(message);
    } else {
      currentState = await runtime.updateRecentMessageState(currentState);
    }
    try {
      elizaLogger11.log("Composing network trending pools context...");
      const trendingContext = composeContext8({
        state: currentState,
        template: getNetworkTrendingPoolsTemplate
      });
      const result = await generateObject8({
        runtime,
        context: trendingContext,
        modelClass: ModelClass8.LARGE,
        schema: GetNetworkTrendingPoolsSchema
      });
      if (!isGetNetworkTrendingPoolsContent(result.object)) {
        elizaLogger11.error(
          "Invalid network trending pools request format"
        );
        return false;
      }
      const networks = await getNetworksData(runtime);
      const network = networks.find((n) => {
        const searchTerm = result.object.networkId.toLowerCase();
        return n.id.toLowerCase() === searchTerm || n.attributes.name.toLowerCase().includes(searchTerm) || n.attributes.coingecko_asset_platform_id.toLowerCase() === searchTerm;
      });
      if (!network) {
        throw new Error(
          `Network ${result.object.networkId} not found in available networks`
        );
      }
      const config = await validateCoingeckoConfig(runtime);
      const { baseUrl, apiKey, headerKey } = getApiConfig(config);
      elizaLogger11.log(
        `Fetching trending pools data for network: ${network.id}`
      );
      const response = await axios11.get(
        `${baseUrl}/onchain/networks/${network.id}/trending_pools?include=base_token,dex`,
        {
          headers: {
            [headerKey]: apiKey
          }
        }
      );
      if (!response.data) {
        throw new Error("No data received from CoinGecko API");
      }
      const formattedData = response.data.data.slice(0, result.object.limit).map((pool) => ({
        name: pool.attributes.name,
        marketCap: Number(
          pool.attributes.market_cap_usd
        ).toLocaleString("en-US", {
          style: "currency",
          currency: "USD"
        }),
        fdv: Number(pool.attributes.fdv_usd).toLocaleString(
          "en-US",
          {
            style: "currency",
            currency: "USD"
          }
        ),
        reserveUSD: Number(
          pool.attributes.reserve_in_usd
        ).toLocaleString("en-US", {
          style: "currency",
          currency: "USD"
        }),
        createdAt: new Date(
          pool.attributes.pool_created_at
        ).toLocaleDateString()
      }));
      const responseText = [
        `Trending Pools Overview for ${network.attributes.name}:`,
        "",
        ...formattedData.map(
          (pool, index) => [
            `${index + 1}. ${pool.name}`,
            `   Market Cap: ${pool.marketCap}`,
            `   FDV: ${pool.fdv}`,
            `   Reserve: ${pool.reserveUSD}`,
            `   Created: ${pool.createdAt}`,
            ""
          ].join("\n")
        )
      ].join("\n");
      elizaLogger11.success(
        "Network trending pools data retrieved successfully!"
      );
      if (callback) {
        callback({
          text: responseText,
          content: {
            networkId: network.id,
            networkName: network.attributes.name,
            trendingPools: formattedData,
            timestamp: (/* @__PURE__ */ new Date()).toISOString()
          }
        });
      }
      return true;
    } catch (error) {
      elizaLogger11.error(
        "Error in GET_NETWORK_TRENDING_POOLS handler:",
        error
      );
      const errorMessage = error.response?.status === 429 ? "Rate limit exceeded. Please try again later." : `Error fetching trending pools data: ${error.message}`;
      if (callback) {
        callback({
          text: errorMessage,
          content: {
            error: error.message,
            statusCode: error.response?.status
          }
        });
      }
      return false;
    }
  },
  examples: [
    [
      {
        user: "{{user1}}",
        content: {
          text: "Show me trending liquidity pools on Solana"
        }
      },
      {
        user: "{{agent}}",
        content: {
          text: "I'll check the trending Solana liquidity pools for you.",
          action: "GET_NETWORK_TRENDING_POOLS"
        }
      },
      {
        user: "{{agent}}",
        content: {
          text: "Here are the trending pools on SOLANA:\n1. MELANIA / USDC\n   Market Cap: $954,636,707\n   FDV: $6,402,478,508\n   Reserve: $363,641,037\n   Created: 1/19/2025\n2. TRUMP / USDC\n   Market Cap: $8,844,297,825\n   FDV: $43,874,068,484\n   Reserve: $718,413,745\n   Created: 1/17/2025"
        }
      }
    ],
    [
      {
        user: "{{user1}}",
        content: {
          text: "What are the top 5 hottest pools on Ethereum?"
        }
      },
      {
        user: "{{agent}}",
        content: {
          text: "I'll fetch the top 5 hottest pools on Ethereum for you.",
          action: "GET_NETWORK_TRENDING_POOLS"
        }
      },
      {
        user: "{{agent}}",
        content: {
          text: "Here are the top 5 trending pools on ETHEREUM:\n1. PEPE / WETH\n   Market Cap: $954,636,707\n   FDV: $6,402,478,508\n   Reserve: $363,641,037\n   Created: 1/19/2025"
        }
      }
    ],
    [
      {
        user: "{{user1}}",
        content: {
          text: "List all BSC pools with highest volume"
        }
      },
      {
        user: "{{agent}}",
        content: {
          text: "I'll get all the trending pools on BSC for you.",
          action: "GET_NETWORK_TRENDING_POOLS"
        }
      },
      {
        user: "{{agent}}",
        content: {
          text: "Here are all trending pools on BSC:\n1. CAKE / WBNB\n   Market Cap: $954,636,707\n   FDV: $6,402,478,508\n   Reserve: $363,641,037\n   Created: 1/19/2025"
        }
      }
    ]
  ]
};

// src/actions/getNetworkNewPools.ts
import {
  composeContext as composeContext9,
  elizaLogger as elizaLogger12,
  generateObject as generateObject9,
  ModelClass as ModelClass9
} from "@elizaos/core";
import axios12 from "axios";

// src/templates/networkNewPools.ts
var getNetworkNewPoolsTemplate = `Determine if this is a network-specific new pools request. If it is one of the specified situations, extract the network ID and limit:

Situation 1: "Get network new pools"
- Message contains: network name AND phrases about new/recent/latest pools
- Example: "Show new pools on Ethereum" or "What are the latest pools on BSC?"
- Action: Extract network ID and use default limit

Situation 2: "Get specific number of new pools"
- Message contains: number AND network name AND new/recent/latest pools reference
- Example: "Show 5 newest pools on Polygon" or "Get 20 latest pools on Avalanche"
- Action: Extract network ID and specific limit

Situation 3: "Get all new pools"
- Message contains: "all" AND network name AND new/recent/latest pools reference
- Example: "Show all new pools on BSC" or "List all recent pools on Ethereum"
- Action: Extract network ID and set maximum limit

Network ID mappings:
- "solana", "sol" => "solana"
- "ethereum", "eth" => "eth"
- "binance smart chain", "bsc", "bnb chain" => "bsc"
- "polygon", "matic" => "polygon_pos"
- "avalanche", "avax" => "avax"

For all situations, respond with a JSON object in the format:
\`\`\`json
{
    "networkId": string,
    "limit": number
}
\`\`\`

Previous conversation for context:
{{conversation}}

You are replying to: {{message}}
`;

// src/actions/getNetworkNewPools.ts
var GetNetworkNewPoolsSchema = z.object({
  networkId: z.string(),
  limit: z.number().min(1).max(100).default(10)
});
var isGetNetworkNewPoolsContent = (obj) => {
  return GetNetworkNewPoolsSchema.safeParse(obj).success;
};
var getNetworkNewPools_default = {
  name: "GET_NETWORK_NEW_POOLS",
  similes: [
    "NETWORK_NEW_POOLS",
    "CHAIN_NEW_POOLS",
    "NEW_POOLS_BY_NETWORK",
    "RECENT_POOLS",
    "LATEST_POOLS"
  ],
  validate: async (runtime, _message) => {
    await validateCoingeckoConfig(runtime);
    return true;
  },
  description: "Get list of newly created pools for a specific network from CoinGecko's onchain data",
  handler: async (runtime, message, state, _options, callback) => {
    elizaLogger12.log("Starting CoinGecko GET_NETWORK_NEW_POOLS handler...");
    let currentState = state;
    if (!currentState) {
      currentState = await runtime.composeState(message);
    } else {
      currentState = await runtime.updateRecentMessageState(currentState);
    }
    try {
      elizaLogger12.log("Composing network new pools context...");
      const newPoolsContext = composeContext9({
        state: currentState,
        template: getNetworkNewPoolsTemplate
      });
      const result = await generateObject9({
        runtime,
        context: newPoolsContext,
        modelClass: ModelClass9.LARGE,
        schema: GetNetworkNewPoolsSchema
      });
      if (!isGetNetworkNewPoolsContent(result.object)) {
        elizaLogger12.error("Invalid network new pools request format");
        return false;
      }
      const networks = await getNetworksData(runtime);
      const networksResponse = await getNetworksData(runtime);
      const network = networksResponse.find((n) => {
        const searchTerm = result.object.networkId.toLowerCase();
        return n.id.toLowerCase() === searchTerm || n.attributes.name.toLowerCase().includes(searchTerm) || n.attributes.coingecko_asset_platform_id.toLowerCase() === searchTerm;
      });
      if (!network) {
        throw new Error(
          `Network ${result.object.networkId} not found in available networks`
        );
      }
      const config = await validateCoingeckoConfig(runtime);
      const { baseUrl, apiKey, headerKey } = getApiConfig(config);
      elizaLogger12.log(
        `Fetching new pools data for network: ${network.id}`
      );
      const response = await axios12.get(
        `${baseUrl}/onchain/networks/${network.id}/new_pools?include=base_token,dex`,
        {
          headers: {
            [headerKey]: apiKey
          }
        }
      );
      if (!response.data) {
        throw new Error("No data received from CoinGecko API");
      }
      const formattedData = response.data.data.slice(0, result.object.limit).map((pool) => ({
        name: pool.attributes.name,
        marketCap: Number(
          pool.attributes.market_cap_usd
        ).toLocaleString("en-US", {
          style: "currency",
          currency: "USD"
        }),
        fdv: Number(pool.attributes.fdv_usd).toLocaleString(
          "en-US",
          {
            style: "currency",
            currency: "USD"
          }
        ),
        reserveUSD: Number(
          pool.attributes.reserve_in_usd
        ).toLocaleString("en-US", {
          style: "currency",
          currency: "USD"
        }),
        createdAt: new Date(
          pool.attributes.pool_created_at
        ).toLocaleDateString()
      }));
      const responseText = [
        `New Pools Overview for ${network.attributes.name}:`,
        "",
        ...formattedData.map(
          (pool, index) => [
            `${index + 1}. ${pool.name}`,
            `   Market Cap: ${pool.marketCap}`,
            `   FDV: ${pool.fdv}`,
            `   Reserve: ${pool.reserveUSD}`,
            `   Created: ${pool.createdAt}`,
            ""
          ].join("\n")
        )
      ].join("\n");
      elizaLogger12.success(
        "Network new pools data retrieved successfully!"
      );
      if (callback) {
        callback({
          text: responseText,
          content: {
            networkId: network.id,
            networkName: network.attributes.name,
            newPools: formattedData,
            timestamp: (/* @__PURE__ */ new Date()).toISOString()
          }
        });
      }
      return true;
    } catch (error) {
      elizaLogger12.error("Error in GET_NETWORK_NEW_POOLS handler:", error);
      const errorMessage = error.response?.status === 429 ? "Rate limit exceeded. Please try again later." : `Error fetching new pools data: ${error.message}`;
      if (callback) {
        callback({
          text: errorMessage,
          content: {
            error: error.message,
            statusCode: error.response?.status
          }
        });
      }
      return false;
    }
  },
  examples: [
    [
      {
        user: "{{user1}}",
        content: {
          text: "Show me new liquidity pools on Ethereum"
        }
      },
      {
        user: "{{agent}}",
        content: {
          text: "I'll check the new Ethereum liquidity pools for you.",
          action: "GET_NETWORK_NEW_POOLS"
        }
      },
      {
        user: "{{agent}}",
        content: {
          text: "Here are the new pools on ETHEREUM:\n1. PEPE / WETH\n   Market Cap: $954,636,707\n   FDV: $6,402,478,508\n   Reserve: $363,641,037\n   Created: 1/19/2025\n2. SUSHI / WETH\n   Market Cap: $8,844,297,825\n   FDV: $43,874,068,484\n   Reserve: $718,413,745\n   Created: 1/17/2025"
        }
      }
    ],
    [
      {
        user: "{{user1}}",
        content: {
          text: "What are the 5 latest pools on BSC?"
        }
      },
      {
        user: "{{agent}}",
        content: {
          text: "I'll fetch the 5 latest pools on BSC for you.",
          action: "GET_NETWORK_NEW_POOLS"
        }
      },
      {
        user: "{{agent}}",
        content: {
          text: "Here are the 5 newest pools on BSC:\n1. CAKE / WBNB\n   Market Cap: $954,636,707\n   FDV: $6,402,478,508\n   Reserve: $363,641,037\n   Created: 1/19/2025"
        }
      }
    ],
    [
      {
        user: "{{user1}}",
        content: {
          text: "List all recent pools on Polygon"
        }
      },
      {
        user: "{{agent}}",
        content: {
          text: "I'll get all the recently added pools on Polygon for you.",
          action: "GET_NETWORK_NEW_POOLS"
        }
      },
      {
        user: "{{agent}}",
        content: {
          text: "Here are all new pools on POLYGON:\n1. MATIC / USDC\n   Market Cap: $954,636,707\n   FDV: $6,402,478,508\n   Reserve: $363,641,037\n   Created: 1/19/2025"
        }
      }
    ]
  ]
};

// src/index.ts
var coingeckoPlugin = {
  name: "coingecko",
  description: "CoinGecko Plugin for Eliza",
  actions: [
    getPrice_default,
    getPricePerAddress_default,
    getTrending_default,
    getTrendingPools_default,
    getMarkets_default,
    getTopGainersLosers_default,
    getNewlyListed_default,
    getNetworkTrendingPools_default,
    getNetworkNewPools_default
  ],
  evaluators: [],
  providers: [categoriesProvider, coinsProvider, networksProvider]
};
var index_default = coingeckoPlugin;
export {
  coingeckoPlugin,
  index_default as default
};
//# sourceMappingURL=index.js.map