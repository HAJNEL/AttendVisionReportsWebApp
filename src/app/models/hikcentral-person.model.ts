export interface HikCentralPerson {
  personId?: string | null;
  personCode?: string | null;
  personName?: string | null;
  personFamilyName?: string | null;
  personGivenName?: string | null;
  gender?: number | null;
  orgIndexCode?: string | null;
  phoneNo?: string | null;
  email?: string | null;
  jobNo?: string | null;
  remark?: string | null;
  beginTime?: string | null;
  endTime?: string | null;
}

export interface HikCentralPersonListData {
  total: number;
  pageNo: number;
  pageSize: number;
  list: HikCentralPerson[] | null;
}

export interface HikCentralAddPersonRequest {
  personCode: string;
  personFamilyName: string;
  personGivenName: string;
  orgIndexCode: string;
  gender?: number | null;
  phoneNo?: string | null;
  email?: string | null;
  remark?: string | null;
  beginTime: string;
  endTime: string;
}

export interface HikCentralUpdatePersonRequest {
  personId: string;
  personName?: string | null;
  orgIndexCode?: string | null;
  gender?: number | null;
  phoneNo?: string | null;
  email?: string | null;
  jobNo?: string | null;
}

export interface HikCentralOrganization {
  orgIndexCode?: string | null;
  orgName?: string | null;
  parentOrgIndexCode?: string | null;
}

export interface HikCentralOrgListData {
  total: number;
  list: HikCentralOrganization[] | null;
}

// NOTE: HikCentral's own API mixes casing conventions (privilegeGroupId is
// camelCase, but the nested ElementList/Element/BaseInfo/AreaName are
// PascalCase) and that raw casing passes straight through our backend's
// JsonPropertyName-annotated DTOs unchanged — hence the mixed casing here.
export interface HikCentralAccessLevelElement {
  Element?: {
    BaseInfo?: {
      Name?: string | null;
      AreaName?: string | null;
    } | null;
  } | null;
}

export interface HikCentralAccessLevel {
  privilegeGroupId?: string | null;
  privilegeGroupName?: string | null;
  description?: string | null;
  ElementList?: HikCentralAccessLevelElement[] | null;
}

export interface HikCentralAccessLevelListData {
  total: number;
  pageNo: number;
  pageSize: number;
  list: HikCentralAccessLevel[] | null;
}
