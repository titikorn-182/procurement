export type Pol01Person = {
  name: string;
  position: string;
};

export type Pol01CommitteeMember = {
  name: string;
  role: "ประธาน" | "กรรมการ";
};

export type Pol01ApprovalDetails = {
  requester: Pol01Person;
  committee: [Pol01CommitteeMember, Pol01CommitteeMember, Pol01CommitteeMember];
  endorser: Pol01Person;
  approver: Pol01Person;
};

const DEFAULT_DETAILS: Pol01ApprovalDetails = {
  requester: {
    name: "นายฐิติกรณ์รัศมิ์ ภัททสิริภูวดล",
    position: "รก.หัวหน้าสำนักงานเลขานุการ",
  },
  committee: [
    { name: "นายฐิติกรณ์รัศมิ์ ภัททสิริภูวดล", role: "ประธาน" },
    { name: "", role: "กรรมการ" },
    { name: "", role: "กรรมการ" },
  ],
  endorser: {
    name: "นายวุฒิ อิงคภาวรวงศ์",
    position: "รองคณบดีฝ่ายบริหารและพัฒนาองค์การ",
  },
  approver: {
    name: "นางสาวศิริพร จันทนสกุลวงศ์",
    position: "คณบดีคณะรัฐศาสตร์ ปฏิบัติราชการแทนอธิการบดี",
  },
};

function record(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function text(value: unknown, fallback = "") {
  return typeof value === "string" ? value.trim() : fallback;
}

function person(value: unknown, fallback: Pol01Person): Pol01Person {
  const source = record(value);
  return {
    name: text(source.name, fallback.name),
    position: text(source.position, fallback.position),
  };
}

export function createDefaultPol01ApprovalDetails(): Pol01ApprovalDetails {
  return {
    requester: { ...DEFAULT_DETAILS.requester },
    committee: DEFAULT_DETAILS.committee.map((member) => ({
      ...member,
    })) as Pol01ApprovalDetails["committee"],
    endorser: { ...DEFAULT_DETAILS.endorser },
    approver: { ...DEFAULT_DETAILS.approver },
  };
}

export function normalizePol01ApprovalDetails(value: unknown): Pol01ApprovalDetails {
  const source = record(value);
  const committeeSource = Array.isArray(source.committee) ? source.committee : [];
  const defaults = createDefaultPol01ApprovalDetails();
  const committee = defaults.committee.map((fallback, index) => {
    const member = record(committeeSource[index]);
    return {
      name: text(member.name, fallback.name),
      role: member.role === "ประธาน" || member.role === "กรรมการ" ? member.role : fallback.role,
    };
  }) as Pol01ApprovalDetails["committee"];

  return {
    requester: person(source.requester, defaults.requester),
    committee,
    endorser: person(source.endorser, defaults.endorser),
    approver: person(source.approver, defaults.approver),
  };
}
