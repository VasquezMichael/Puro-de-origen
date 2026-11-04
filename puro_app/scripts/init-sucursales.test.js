const assert = require("node:assert/strict");
const test = require("node:test");

const { run } = require("./init-sucursales");

function createLogger() {
  return {
    log() {},
    error() {},
  };
}

function createMocks({ connectError, createError, disconnectError } = {}) {
  const calls = {
    connect: 0,
    create: 0,
    disconnect: 0,
  };

  const mongooseClient = {
    async connect() {
      calls.connect += 1;
      if (connectError) throw connectError;
    },
    async disconnect() {
      calls.disconnect += 1;
      if (disconnectError) throw disconnectError;
    },
  };

  const SucursalModel = {
    async findOne() {
      return null;
    },
    async create(data) {
      calls.create += 1;
      if (createError) throw createError;
      return data;
    },
    async find() {
      return [];
    },
  };

  return { calls, mongooseClient, SucursalModel };
}

test("returns 1 without MONGODB_URI and does not connect", async () => {
  const mocks = createMocks();
  const exitCode = await run({
    mongoUri: "",
    mongooseClient: mocks.mongooseClient,
    SucursalModel: mocks.SucursalModel,
    logger: createLogger(),
  });

  assert.equal(exitCode, 1);
  assert.equal(mocks.calls.connect, 0);
  assert.equal(mocks.calls.disconnect, 0);
});

test("returns 1 when the MongoDB connection fails", async () => {
  const mocks = createMocks({ connectError: new Error("connection failed") });
  const exitCode = await run({
    mongoUri: "mongodb://mocked",
    mongooseClient: mocks.mongooseClient,
    SucursalModel: mocks.SucursalModel,
    logger: createLogger(),
  });

  assert.equal(exitCode, 1);
  assert.equal(mocks.calls.connect, 1);
  assert.equal(mocks.calls.disconnect, 1);
});

test("returns 1 when a MongoDB operation fails", async () => {
  const mocks = createMocks({ createError: new Error("insert failed") });
  const exitCode = await run({
    mongoUri: "mongodb://mocked",
    mongooseClient: mocks.mongooseClient,
    SucursalModel: mocks.SucursalModel,
    logger: createLogger(),
  });

  assert.equal(exitCode, 1);
  assert.equal(mocks.calls.create, 1);
  assert.equal(mocks.calls.disconnect, 1);
});

test("returns 1 when MongoDB disconnection fails", async () => {
  const mocks = createMocks({ disconnectError: new Error("disconnect failed") });
  const exitCode = await run({
    mongoUri: "mongodb://mocked",
    mongooseClient: mocks.mongooseClient,
    SucursalModel: mocks.SucursalModel,
    logger: createLogger(),
  });

  assert.equal(exitCode, 1);
  assert.equal(mocks.calls.disconnect, 1);
});

test("returns 0 after a successful mocked initialization", async () => {
  const mocks = createMocks();
  const exitCode = await run({
    mongoUri: "mongodb://mocked",
    mongooseClient: mocks.mongooseClient,
    SucursalModel: mocks.SucursalModel,
    logger: createLogger(),
  });

  assert.equal(exitCode, 0);
  assert.equal(mocks.calls.connect, 1);
  assert.equal(mocks.calls.create, 4);
  assert.equal(mocks.calls.disconnect, 1);
});
