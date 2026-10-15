import type { Page, Route } from "@playwright/test";

export type RoleName = "diner" | "franchisee" | "admin";

export type MockUser = {
  id: string;
  name: string;
  email: string;
  password: string;
  roles: { role: string; objectId?: string }[];
};

export type MockStore = { id: string; name: string; totalRevenue: number };

export type MockFranchise = {
  id: string;
  name: string;
  admins: { id: string; name: string; email: string }[];
  stores: MockStore[];
};

// The three kinds of people who use JWT Pizza.
export const users: Record<RoleName, MockUser> = {
  diner: {
    id: "3",
    name: "Pizza Diner",
    email: "d@jwt.com",
    password: "diner",
    roles: [{ role: "diner" }],
  },
  franchisee: {
    id: "4",
    name: "Pizza Franchisee",
    email: "f@jwt.com",
    password: "franchisee",
    roles: [{ role: "franchisee", objectId: "1" }],
  },
  admin: {
    id: "1",
    name: "Admin User",
    email: "a@jwt.com",
    password: "admin",
    roles: [{ role: "admin" }],
  },
};

// What the header avatar shows for each user (first + last initial).
export const initials: Record<RoleName, string> = {
  diner: "PD",
  franchisee: "PF",
  admin: "AU",
};

export const menu = [
  {
    id: "1",
    title: "Veggie",
    image: "pizza1.png",
    price: 0.0038,
    description: "A garden of delight",
  },
  {
    id: "2",
    title: "Pepperoni",
    image: "pizza2.png",
    price: 0.0042,
    description: "Spicy treat",
  },
];

export function defaultFranchises(): MockFranchise[] {
  return [
    {
      id: "1",
      name: "pizzaPocket",
      admins: [{ id: "4", name: "Pizza Franchisee", email: "f@jwt.com" }],
      stores: [{ id: "1", name: "SLC", totalRevenue: 0 }],
    },
    {
      id: "2",
      name: "lotaPizza",
      admins: [{ id: "5", name: "Other Owner", email: "o@jwt.com" }],
      stores: [
        { id: "2", name: "Lehi", totalRevenue: 0 },
        { id: "3", name: "Springville", totalRevenue: 0 },
      ],
    },
  ];
}

// Builds a franchise with a predictable name, useful for pagination tests.
export function makeFranchise(n: number): MockFranchise {
  return {
    id: String(200 + n),
    name: `pie${n}`,
    admins: [],
    stores: [{ id: String(300 + n), name: `shop${n}`, totalRevenue: 0 }],
  };
}

export type MockOrder = {
  id: string;
  franchiseId: string;
  storeId: string;
  date: string;
  items: { id?: string; menuId: string; description: string; price: number }[];
};

export type BackendOptions = {
  franchises?: MockFranchise[];
  orders?: MockOrder[];
  // When true, POST /api/order fails the way the real service does when the factory is down.
  failOrders?: boolean;
};

// In-memory stand-in for the jwt-pizza-service. Tests can read and change it directly.
export type Backend = {
  currentUser: Omit<MockUser, "password"> | null;
  registered: MockUser[];
  franchises: MockFranchise[];
  orders: MockOrder[];
  failOrders: boolean;
  nextId: number;
  requests: string[];
};

export function publicUser(user: MockUser) {
  const { password, ...rest } = user;
  return rest;
}

function hasRole(backend: Backend, role: string) {
  return !!backend.currentUser?.roles.some((r) => r.role === role);
}

function ownsFranchise(backend: Backend, franchise: MockFranchise) {
  return franchise.admins.some((a) => a.email === backend.currentUser?.email);
}

function readBody(route: Route): any {
  try {
    return route.request().postDataJSON() ?? {};
  } catch {
    return {};
  }
}

// Mirrors the permission rules in the real franchiseRouter, so the UI tests see the same 401/403 behavior.
async function handle(route: Route, b: Backend) {
  const request = route.request();
  const url = new URL(request.url());
  const method = request.method();
  const path = url.pathname;
  const body = readBody(route);
  b.requests.push(`${method} ${path}`);

  const headers = {
    "access-control-allow-origin": request.headers()["origin"] ?? "*",
    "access-control-allow-credentials": "true",
  };
  const respond = (json: unknown, status = 200) =>
    route.fulfill({ status, json, headers });

  // The pizza factory verifies the JWT on the delivery page.
  if (path === "/api/order/verify" && method === "POST") {
    return respond({
      message: "valid",
      payload: { vendor: { id: "mock", name: "Mock Factory" } },
    });
  }

  if (path === "/api/auth") {
    if (method === "PUT") {
      const found = [...Object.values(users), ...b.registered].find(
        (u) => u.email === body.email && u.password === body.password,
      );
      if (!found) return respond({ message: "unknown user" }, 404);
      b.currentUser = publicUser(found);
      return respond({ user: b.currentUser, token: `token-${found.id}` });
    }
    if (method === "POST") {
      const created: MockUser = {
        id: String(b.nextId++),
        name: body.name,
        email: body.email,
        password: body.password,
        roles: [{ role: "diner" }],
      };
      b.registered.push(created);
      b.currentUser = publicUser(created);
      return respond({ user: b.currentUser, token: `token-${created.id}` });
    }
    if (method === "DELETE") {
      b.currentUser = null;
      return respond({ message: "logout successful" });
    }
  }

  if (path === "/api/user/me") {
    return b.currentUser
      ? respond(b.currentUser)
      : respond({ message: "unauthorized" }, 401);
  }

  if (path === "/api/order/menu") return respond(menu);

  if (path === "/api/order") {
    if (!b.currentUser) return respond({ message: "unauthorized" }, 401);
    if (method === "GET")
      return respond({ dinerId: b.currentUser.id, orders: b.orders, page: 1 });
    if (method === "POST") {
      if (b.failOrders)
        return respond({ message: "Failed to fulfill order at factory" }, 500);
      const order: MockOrder = {
        ...body,
        id: String(b.nextId++),
        date: new Date().toISOString(),
      };
      b.orders.push(order);
      return respond({ order, jwt: "eyJmb28.eyJiYXI.mock-signature" });
    }
  }

  if (path === "/api/franchise") {
    if (method === "GET") {
      const page = Number(url.searchParams.get("page") ?? 0);
      const limit = Number(url.searchParams.get("limit") ?? 10);
      const filter = (url.searchParams.get("name") ?? "*")
        .split("*")
        .map((s) => s.replace(/[.+?^${}()|[\]\\]/g, "\\$&"))
        .join(".*");
      const matching = b.franchises.filter((f) =>
        new RegExp(`^${filter}$`, "i").test(f.name),
      );
      const franchises = matching.slice(page * limit, page * limit + limit);
      return respond({
        franchises,
        more: matching.length > page * limit + limit,
      });
    }
    if (method === "POST") {
      if (!b.currentUser) return respond({ message: "unauthorized" }, 401);
      if (!hasRole(b, "admin"))
        return respond({ message: "unable to create a franchise" }, 403);
      const admins = [];
      for (const admin of body.admins ?? []) {
        const found = [...Object.values(users), ...b.registered].find(
          (u) => u.email === admin.email,
        );
        if (!found)
          return respond(
            {
              message: `unknown user for franchise admin ${admin.email} provided`,
            },
            404,
          );
        admins.push({ id: found.id, name: found.name, email: found.email });
      }
      const franchise: MockFranchise = {
        id: String(b.nextId++),
        name: body.name,
        admins,
        stores: [],
      };
      b.franchises.push(franchise);
      return respond(franchise);
    }
  }

  const franchiseMatch = path.match(/^\/api\/franchise\/(\d+)$/);
  if (franchiseMatch) {
    const id = franchiseMatch[1];
    if (method === "GET") {
      if (!b.currentUser) return respond({ message: "unauthorized" }, 401);
      const allowed = b.currentUser.id === id || hasRole(b, "admin");
      const mine = b.franchises.filter((f) =>
        f.admins.some((a) => a.id === id),
      );
      return respond(allowed ? mine : []);
    }
    if (method === "DELETE") {
      if (!b.currentUser) return respond({ message: "unauthorized" }, 401);
      if (!hasRole(b, "admin"))
        return respond({ message: "unable to delete a franchise" }, 403);
      b.franchises = b.franchises.filter((f) => f.id !== id);
      return respond({ message: "franchise deleted" });
    }
  }

  const storeCreateMatch = path.match(/^\/api\/franchise\/(\d+)\/store$/);
  if (storeCreateMatch && method === "POST") {
    if (!b.currentUser) return respond({ message: "unauthorized" }, 401);
    const franchise = b.franchises.find((f) => f.id === storeCreateMatch[1]);
    if (!franchise || (!hasRole(b, "admin") && !ownsFranchise(b, franchise)))
      return respond({ message: "unable to create a store" }, 403);
    const store: MockStore = {
      id: String(b.nextId++),
      name: body.name,
      totalRevenue: 0,
    };
    franchise.stores.push(store);
    return respond({ ...store, franchiseId: franchise.id });
  }

  const storeDeleteMatch = path.match(
    /^\/api\/franchise\/(\d+)\/store\/(\d+)$/,
  );
  if (storeDeleteMatch && method === "DELETE") {
    if (!b.currentUser) return respond({ message: "unauthorized" }, 401);
    const franchise = b.franchises.find((f) => f.id === storeDeleteMatch[1]);
    if (!franchise || (!hasRole(b, "admin") && !ownsFranchise(b, franchise)))
      return respond({ message: "unable to delete a store" }, 403);
    franchise.stores = franchise.stores.filter(
      (s) => s.id !== storeDeleteMatch[2],
    );
    return respond({ message: "store deleted" });
  }

  return respond({ message: "unknown endpoint" }, 404);
}

// Intercepts every /api/ call the frontend makes and answers it from memory.
export async function mockBackend(
  page: Page,
  options: BackendOptions = {},
): Promise<Backend> {
  const backend: Backend = {
    currentUser: null,
    registered: [],
    franchises: options.franchises ?? defaultFranchises(),
    orders: options.orders ?? [],
    failOrders: options.failOrders ?? false,
    nextId: 100,
    requests: [],
  };
  await page.route("**/api/**", (route) => handle(route, backend));
  await page.route(/\/api\/user\?/, async (route) => {
    await route.fulfill({ json: { users: [], more: false } });
  });
  return backend;
}
