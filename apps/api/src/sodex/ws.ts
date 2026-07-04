import WebSocket from "ws";
import type { SodexEnvironment } from "./client.js";
import type { Env } from "@heirlock/config";

export type WsMessageHandler = (msg: unknown) => void;

/**
 * Official SoDEX WebSocket client (spot or perps).
 * User streams do not require API-key auth.
 * Heartbeat: ping if idle approaching 60s disconnect.
 * Source: https://sodex.com/documentation/trading-api/websocket-v1
 */
export class SodexWsClient {
  private ws: WebSocket | null = null;
  private pingTimer: NodeJS.Timeout | null = null;
  private lastMessageAt = 0;
  private readonly handlers = new Set<WsMessageHandler>();
  private closed = false;

  constructor(
    private readonly url: string,
    private readonly idlePingMs = 25_000,
  ) {}

  static fromEnv(env: Env, environment: SodexEnvironment, market: "spot" | "perps" = "spot") {
    const url =
      environment === "testnet"
        ? market === "spot"
          ? env.SODEX_TESTNET_SPOT_WS
          : env.SODEX_TESTNET_PERPS_WS
        : market === "spot"
          ? env.SODEX_MAINNET_SPOT_WS
          : env.SODEX_MAINNET_PERPS_WS;
    return new SodexWsClient(url);
  }

  onMessage(handler: WsMessageHandler) {
    this.handlers.add(handler);
    return () => this.handlers.delete(handler);
  }

  connect(): Promise<void> {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) return Promise.resolve();
    this.closed = false;
    return new Promise((resolve, reject) => {
      const ws = new WebSocket(this.url);
      this.ws = ws;
      ws.on("open", () => {
        this.lastMessageAt = Date.now();
        this.startHeartbeat();
        resolve();
      });
      ws.on("message", (data) => {
        this.lastMessageAt = Date.now();
        let parsed: unknown = data.toString();
        try {
          parsed = JSON.parse(data.toString());
        } catch {
          /* keep string */
        }
        for (const h of this.handlers) h(parsed);
      });
      ws.on("error", (err) => {
        if (!this.closed) reject(err);
      });
      ws.on("close", () => {
        this.stopHeartbeat();
      });
    });
  }

  subscribe(params: Record<string, unknown>, id = Date.now()) {
    this.send({ op: "subscribe", id, params });
  }

  unsubscribe(params: Record<string, unknown>, id = Date.now()) {
    this.send({ op: "unsubscribe", id, params });
  }

  close() {
    this.closed = true;
    this.stopHeartbeat();
    this.ws?.close();
    this.ws = null;
  }

  private send(payload: unknown) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      throw new Error("SoDEX WS not connected");
    }
    this.ws.send(JSON.stringify(payload));
  }

  private startHeartbeat() {
    this.stopHeartbeat();
    this.pingTimer = setInterval(() => {
      if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
      if (Date.now() - this.lastMessageAt > this.idlePingMs) {
        this.send({ op: "ping" });
      }
    }, 5_000);
  }

  private stopHeartbeat() {
    if (this.pingTimer) clearInterval(this.pingTimer);
    this.pingTimer = null;
  }
}
