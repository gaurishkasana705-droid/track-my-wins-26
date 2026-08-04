// ⚠️ TEMPORARY MOCK DATABASE (DEMO MODE ONLY) ⚠️
//
// A tiny localStorage-backed stand-in for the subset of the Supabase query
// builder this app uses (.from().select()/.insert()/.update()/.delete()/
// .upsert() with .eq/.neq/.gte/.lte/.in/.order/.limit/.single/.maybeSingle).
//
// TODO(auth): delete this file once real authentication is re-enabled — see
// src/lib/demo-mode.ts. No production code path should ever reach it while
// VITE_DEMO_MODE is "false".

import { DEMO_USER_ID } from "./demo-mode";

const STORAGE_KEY = "lifetrack:demo-db";

type Row = Record<string, any>;
type Store = Record<string, Row[]>;

function read(): Store {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(window.localStorage.getItem(STORAGE_KEY) || "{}") as Store;
  } catch {
    return {};
  }
}

function write(store: Store) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  } catch {
    /* quota / private mode — ignore, demo data is disposable */
  }
}

function uuid() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `id-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

type Filter = { op: string; col: string; val: any };
type Sort = { col: string; asc: boolean };

function matches(row: Row, filters: Filter[]) {
  return filters.every((f) => {
    const v = row[f.col];
    switch (f.op) {
      case "eq":
        return v === f.val;
      case "neq":
        return v !== f.val;
      case "gte":
        return v >= f.val;
      case "lte":
        return v <= f.val;
      case "gt":
        return v > f.val;
      case "lt":
        return v < f.val;
      case "in":
        return Array.isArray(f.val) && f.val.includes(v);
      case "is":
        return v === f.val || (f.val === null && (v === null || v === undefined));
      default:
        return true;
    }
  });
}

class Query<T = any> implements PromiseLike<{ data: T; error: null }> {
  private filters: Filter[] = [];
  private sorts: Sort[] = [];
  private limitN: number | null = null;
  private mode: "select" | "insert" | "update" | "delete" | "upsert" = "select";
  private payload: Row[] = [];
  private onConflict: string[] = [];
  private single = false;
  private maybe = false;

  constructor(private table: string) {}

  // --- builder -----------------------------------------------------------
  select(_cols?: string) {
    if (this.mode === "select") this.mode = "select";
    return this;
  }
  insert(values: Row | Row[]) {
    this.mode = "insert";
    this.payload = Array.isArray(values) ? values : [values];
    return this;
  }
  update(values: Row) {
    this.mode = "update";
    this.payload = [values];
    return this;
  }
  upsert(values: Row | Row[], opts?: { onConflict?: string }) {
    this.mode = "upsert";
    this.payload = Array.isArray(values) ? values : [values];
    this.onConflict = (opts?.onConflict || "id").split(",").map((s) => s.trim());
    return this;
  }
  delete() {
    this.mode = "delete";
    return this;
  }
  eq(col: string, val: any) { this.filters.push({ op: "eq", col, val }); return this; }
  neq(col: string, val: any) { this.filters.push({ op: "neq", col, val }); return this; }
  gte(col: string, val: any) { this.filters.push({ op: "gte", col, val }); return this; }
  lte(col: string, val: any) { this.filters.push({ op: "lte", col, val }); return this; }
  gt(col: string, val: any) { this.filters.push({ op: "gt", col, val }); return this; }
  lt(col: string, val: any) { this.filters.push({ op: "lt", col, val }); return this; }
  in(col: string, val: any[]) { this.filters.push({ op: "in", col, val }); return this; }
  is(col: string, val: any) { this.filters.push({ op: "is", col, val }); return this; }
  order(col: string, opts?: { ascending?: boolean }) {
    this.sorts.push({ col, asc: opts?.ascending !== false });
    return this;
  }
  limit(n: number) { this.limitN = n; return this; }
  maybeSingle() { this.maybe = true; return this as unknown as Query<any>; }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  single(): any { this.single = true; return this; }

  // --- execution ---------------------------------------------------------
  private run(): { data: any; error: null } {
    const store = read();
    const rows = store[this.table] ?? [];
    const now = new Date().toISOString();

    if (this.mode === "insert" || this.mode === "upsert") {
      const created: Row[] = [];
      for (const raw of this.payload) {
        const record: Row = {
          id: raw.id ?? uuid(),
          user_id: raw.user_id ?? DEMO_USER_ID, // TODO(auth): demo user stand-in
          created_at: raw.created_at ?? now,
          updated_at: now,
          ...raw,
        };
        const idx =
          this.mode === "upsert"
            ? rows.findIndex((r) => this.onConflict.every((c) => r[c] === record[c]))
            : -1;
        if (idx >= 0) rows[idx] = { ...rows[idx], ...record, id: rows[idx].id };
        else rows.push(record);
        created.push(record);
      }
      store[this.table] = rows;
      write(store);
      return { data: this.single || this.maybe ? created[0] ?? null : created, error: null };
    }

    if (this.mode === "update") {
      const updated: Row[] = [];
      store[this.table] = rows.map((r) => {
        if (!matches(r, this.filters)) return r;
        const next = { ...r, ...this.payload[0], updated_at: now };
        updated.push(next);
        return next;
      });
      write(store);
      return { data: this.single || this.maybe ? updated[0] ?? null : updated, error: null };
    }

    if (this.mode === "delete") {
      store[this.table] = rows.filter((r) => !matches(r, this.filters));
      write(store);
      return { data: null, error: null };
    }

    let out = rows.filter((r) => matches(r, this.filters));
    for (const s of [...this.sorts].reverse()) {
      out = [...out].sort((a, b) => {
        const av = a[s.col], bv = b[s.col];
        if (av === bv) return 0;
        const cmp = av > bv || av === true ? 1 : -1;
        return s.asc ? cmp : -cmp;
      });
    }
    if (this.limitN != null) out = out.slice(0, this.limitN);
    if (this.single || this.maybe) return { data: out[0] ?? null, error: null };
    return { data: out, error: null };
  }

  then<TR1 = { data: T; error: null }, TR2 = never>(
    onfulfilled?: ((value: { data: T; error: null }) => TR1 | PromiseLike<TR1>) | null,
    onrejected?: ((reason: unknown) => TR2 | PromiseLike<TR2>) | null,
  ): PromiseLike<TR1 | TR2> {
    return Promise.resolve(this.run() as { data: T; error: null }).then(onfulfilled, onrejected);
  }
}

/** Minimal mock client shaped like the Supabase client (demo mode only). */
export const localDb = {
  from: (table: string) => new Query(table),
  auth: {
    // Demo mode has no session to clear; keep the shape so callers don't crash.
    signOut: async () => ({ error: null }),
  },
};
