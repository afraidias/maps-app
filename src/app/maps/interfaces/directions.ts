export interface DirectionsResponse {
  routes:    Route[];
  waypoints: Waypoint[];
  code:      string;
  uuid:      string;
}

export interface Route {
  weight_name: string;
  weight:      number;
  duration:    number;
  distance:    number;
  legs:        Leg[];
  geometry:    Geometry;
}

export interface Geometry {
  coordinates: Array<number[]>;
  type:        string;
}

export interface Leg {
  via_waypoints: any[];
  admins:        Admin[];
  weight:        number;
  duration:      number;
  steps:         Step[];
  distance:      number;
  summary:       string;
}

export interface Admin {
  iso_3166_1_alpha3: string;
  iso_3166_1:        string;
}

export interface Step {
  intersections: Intersection[];
  maneuver:      Maneuver;
  name:          string;
  duration:      number;
  distance:      number;
  driving_side:  string;
  weight:        number;
  mode:          string;
  geometry:      Geometry;
}

export interface Intersection {
  entry:              boolean[];
  bearings:           number[];
  duration?:          number;
  mapbox_streets_v8?: MapboxStreetsV8;
  is_urban?:          boolean;
  admin_index:        number;
  out?:               number;
  weight?:            number;
  geometry_index:     number;
  location:           number[];
  in?:                number;
  turn_weight?:       number;
  turn_duration?:     number;
  traffic_signal?:    boolean;
  lanes?:             Lane[];
}

export interface Lane {
  indications:       Indication[];
  valid_indication?: Indication;
  valid:             boolean;
  active:            boolean;
}

export enum Indication {
  Left = "left",
  Straight = "straight",
}

export interface MapboxStreetsV8 {
  class: Class;
}

export enum Class {
  Primary = "primary",
  Secondary = "secondary",
  Street = "street",
}

export interface Maneuver {
  type:           string;
  instruction:    string;
  bearing_after:  number;
  bearing_before: number;
  location:       number[];
  modifier?:      string;
}

export interface Waypoint {
  distance: number;
  name:     string;
  location: number[];
}

// Converts JSON strings to/from your types
// and asserts the results of JSON.parse at runtime
export class Convert {
  public static toDirectionsResponse(json: string): DirectionsResponse {
      return cast(JSON.parse(json), r("DirectionsResponse"));
  }

  public static directionsResponseToJson(value: DirectionsResponse): string {
      return JSON.stringify(uncast(value, r("DirectionsResponse")), null, 2);
  }
}

function invalidValue(typ: any, val: any, key: any = ''): never {
  if (key) {
      throw Error(`Invalid value for key "${key}". Expected type ${JSON.stringify(typ)} but got ${JSON.stringify(val)}`);
  }
  throw Error(`Invalid value ${JSON.stringify(val)} for type ${JSON.stringify(typ)}`, );
}

function jsonToJSProps(typ: any): any {
  if (typ.jsonToJS === undefined) {
      const map: any = {};
      typ.props.forEach((p: any) => map[p.json] = { key: p.js, typ: p.typ });
      typ.jsonToJS = map;
  }
  return typ.jsonToJS;
}

function jsToJSONProps(typ: any): any {
  if (typ.jsToJSON === undefined) {
      const map: any = {};
      typ.props.forEach((p: any) => map[p.js] = { key: p.json, typ: p.typ });
      typ.jsToJSON = map;
  }
  return typ.jsToJSON;
}

function transform(val: any, typ: any, getProps: any, key: any = ''): any {
  function transformPrimitive(typ: string, val: any): any {
      if (typeof typ === typeof val) return val;
      return invalidValue(typ, val, key);
  }

  function transformUnion(typs: any[], val: any): any {
      // val must validate against one typ in typs
      const l = typs.length;
      for (let i = 0; i < l; i++) {
          const typ = typs[i];
          try {
              return transform(val, typ, getProps);
          } catch (_) {}
      }
      return invalidValue(typs, val);
  }

  function transformEnum(cases: string[], val: any): any {
      if (cases.indexOf(val) !== -1) return val;
      return invalidValue(cases, val);
  }

  function transformArray(typ: any, val: any): any {
      // val must be an array with no invalid elements
      if (!Array.isArray(val)) return invalidValue("array", val);
      return val.map(el => transform(el, typ, getProps));
  }

  function transformDate(val: any): any {
      if (val === null) {
          return null;
      }
      const d = new Date(val);
      if (isNaN(d.valueOf())) {
          return invalidValue("Date", val);
      }
      return d;
  }

  function transformObject(props: { [k: string]: any }, additional: any, val: any): any {
      if (val === null || typeof val !== "object" || Array.isArray(val)) {
          return invalidValue("object", val);
      }
      const result: any = {};
      Object.getOwnPropertyNames(props).forEach(key => {
          const prop = props[key];
          const v = Object.prototype.hasOwnProperty.call(val, key) ? val[key] : undefined;
          result[prop.key] = transform(v, prop.typ, getProps, prop.key);
      });
      Object.getOwnPropertyNames(val).forEach(key => {
          if (!Object.prototype.hasOwnProperty.call(props, key)) {
              result[key] = transform(val[key], additional, getProps, key);
          }
      });
      return result;
  }

  if (typ === "any") return val;
  if (typ === null) {
      if (val === null) return val;
      return invalidValue(typ, val);
  }
  if (typ === false) return invalidValue(typ, val);
  while (typeof typ === "object" && typ.ref !== undefined) {
      typ = typeMap[typ.ref];
  }
  if (Array.isArray(typ)) return transformEnum(typ, val);
  if (typeof typ === "object") {
      return typ.hasOwnProperty("unionMembers") ? transformUnion(typ.unionMembers, val)
          : typ.hasOwnProperty("arrayItems")    ? transformArray(typ.arrayItems, val)
          : typ.hasOwnProperty("props")         ? transformObject(getProps(typ), typ.additional, val)
          : invalidValue(typ, val);
  }
  // Numbers can be parsed by Date but shouldn't be.
  if (typ === Date && typeof val !== "number") return transformDate(val);
  return transformPrimitive(typ, val);
}

function cast<T>(val: any, typ: any): T {
  return transform(val, typ, jsonToJSProps);
}

function uncast<T>(val: T, typ: any): any {
  return transform(val, typ, jsToJSONProps);
}

function a(typ: any) {
  return { arrayItems: typ };
}

function u(...typs: any[]) {
  return { unionMembers: typs };
}

function o(props: any[], additional: any) {
  return { props, additional };
}

function m(additional: any) {
  return { props: [], additional };
}

function r(name: string) {
  return { ref: name };
}

const typeMap: any = {
  "DirectionsResponse": o([
      { json: "routes", js: "routes", typ: a(r("Route")) },
      { json: "waypoints", js: "waypoints", typ: a(r("Waypoint")) },
      { json: "code", js: "code", typ: "" },
      { json: "uuid", js: "uuid", typ: "" },
  ], false),
  "Route": o([
      { json: "weight_name", js: "weight_name", typ: "" },
      { json: "weight", js: "weight", typ: 3.14 },
      { json: "duration", js: "duration", typ: 3.14 },
      { json: "distance", js: "distance", typ: 3.14 },
      { json: "legs", js: "legs", typ: a(r("Leg")) },
      { json: "geometry", js: "geometry", typ: r("Geometry") },
  ], false),
  "Geometry": o([
      { json: "coordinates", js: "coordinates", typ: a(a(3.14)) },
      { json: "type", js: "type", typ: "" },
  ], false),
  "Leg": o([
      { json: "via_waypoints", js: "via_waypoints", typ: a("any") },
      { json: "admins", js: "admins", typ: a(r("Admin")) },
      { json: "weight", js: "weight", typ: 3.14 },
      { json: "duration", js: "duration", typ: 3.14 },
      { json: "steps", js: "steps", typ: a(r("Step")) },
      { json: "distance", js: "distance", typ: 3.14 },
      { json: "summary", js: "summary", typ: "" },
  ], false),
  "Admin": o([
      { json: "iso_3166_1_alpha3", js: "iso_3166_1_alpha3", typ: "" },
      { json: "iso_3166_1", js: "iso_3166_1", typ: "" },
  ], false),
  "Step": o([
      { json: "intersections", js: "intersections", typ: a(r("Intersection")) },
      { json: "maneuver", js: "maneuver", typ: r("Maneuver") },
      { json: "name", js: "name", typ: "" },
      { json: "duration", js: "duration", typ: 3.14 },
      { json: "distance", js: "distance", typ: 3.14 },
      { json: "driving_side", js: "driving_side", typ: "" },
      { json: "weight", js: "weight", typ: 3.14 },
      { json: "mode", js: "mode", typ: "" },
      { json: "geometry", js: "geometry", typ: r("Geometry") },
  ], false),
  "Intersection": o([
      { json: "entry", js: "entry", typ: a(true) },
      { json: "bearings", js: "bearings", typ: a(0) },
      { json: "duration", js: "duration", typ: u(undefined, 3.14) },
      { json: "mapbox_streets_v8", js: "mapbox_streets_v8", typ: u(undefined, r("MapboxStreetsV8")) },
      { json: "is_urban", js: "is_urban", typ: u(undefined, true) },
      { json: "admin_index", js: "admin_index", typ: 0 },
      { json: "out", js: "out", typ: u(undefined, 0) },
      { json: "weight", js: "weight", typ: u(undefined, 3.14) },
      { json: "geometry_index", js: "geometry_index", typ: 0 },
      { json: "location", js: "location", typ: a(3.14) },
      { json: "in", js: "in", typ: u(undefined, 0) },
      { json: "turn_weight", js: "turn_weight", typ: u(undefined, 0) },
      { json: "turn_duration", js: "turn_duration", typ: u(undefined, 3.14) },
      { json: "traffic_signal", js: "traffic_signal", typ: u(undefined, true) },
      { json: "lanes", js: "lanes", typ: u(undefined, a(r("Lane"))) },
  ], false),
  "Lane": o([
      { json: "indications", js: "indications", typ: a(r("Indication")) },
      { json: "valid_indication", js: "valid_indication", typ: u(undefined, r("Indication")) },
      { json: "valid", js: "valid", typ: true },
      { json: "active", js: "active", typ: true },
  ], false),
  "MapboxStreetsV8": o([
      { json: "class", js: "class", typ: r("Class") },
  ], false),
  "Maneuver": o([
      { json: "type", js: "type", typ: "" },
      { json: "instruction", js: "instruction", typ: "" },
      { json: "bearing_after", js: "bearing_after", typ: 0 },
      { json: "bearing_before", js: "bearing_before", typ: 0 },
      { json: "location", js: "location", typ: a(3.14) },
      { json: "modifier", js: "modifier", typ: u(undefined, "") },
  ], false),
  "Waypoint": o([
      { json: "distance", js: "distance", typ: 3.14 },
      { json: "name", js: "name", typ: "" },
      { json: "location", js: "location", typ: a(3.14) },
  ], false),
  "Indication": [
      "left",
      "straight",
  ],
  "Class": [
      "primary",
      "secondary",
      "street",
  ],
};
