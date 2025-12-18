/**
 * Copilot Service Module
 * Direct Line v3 client
 *
 * NOTE: Frontend secrets are not safe for production.
 */

class CopilotService {
  constructor() {
    this.directLineSecret = (CONFIG.DIRECT_LINE_SECRET || "").trim();
    this.endpoint = (CONFIG.DIRECT_LINE_ENDPOINT || "").replace(/\/+$/, "");

    this.token = null;
    this.conversationId = null;
    this.watermark = null;
    this.isConnected = false;

    this.userId = (CONFIG.DIRECT_LINE_USER_ID || "user").trim();

    this.lastBotActivityId = null;
  }

  assertConfigured() {
    if (!this.directLineSecret) {
      throw new Error("DIRECT_LINE_SECRET missing in config.js");
    }
    if (!this.endpoint.startsWith("https://")) {
      throw new Error(`DIRECT_LINE_ENDPOINT must be https: ${this.endpoint}`);
    }
  }

  async startConversation() {
    this.assertConfigured();

    // 1) Token from secret
    const tokenResp = await fetch(`${this.endpoint}/tokens/generate`, {
      method: "POST",
      headers: { Authorization: `Bearer ${this.directLineSecret}` },
    });

    if (!tokenResp.ok) {
      const body = await tokenResp.text().catch(() => "");
      throw new Error(`Token generate failed (${tokenResp.status}): ${body}`);
    }

    const tokenData = await tokenResp.json();
    this.token = tokenData?.token;
    if (!this.token) throw new Error("No token returned from Direct Line.");

    // 2) Conversation from token
    const convResp = await fetch(`${this.endpoint}/conversations`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.token}`,
        "Content-Type": "application/json",
      },
    });

    if (!convResp.ok) {
      const body = await convResp.text().catch(() => "");
      throw new Error(`Conversation start failed (${convResp.status}): ${body}`);
    }

    const convData = await convResp.json();
    this.conversationId = convData?.conversationId;
    if (!this.conversationId) throw new Error("No conversationId returned.");

    this.watermark = null;
    this.lastBotActivityId = null;
    this.isConnected = true;

    CONFIG.DEBUG &&
      console.log("✅ Direct Line connected", {
        conversationId: this.conversationId,
      });

    return true;
  }

  async sendMessage(message) {
    if (!message || !message.trim()) return "";

    if (!this.isConnected || !this.token || !this.conversationId) {
      await this.startConversation();
    }

    // Send message
    const sendResp = await fetch(
      `${this.endpoint}/conversations/${this.conversationId}/activities`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          type: "message",
          from: { id: this.userId },
          text: message.trim(),
        }),
      }
    );

    if (!sendResp.ok) {
      const body = await sendResp.text().catch(() => "");
      throw new Error(`Send failed (${sendResp.status}): ${body}`);
    }

    CONFIG.DEBUG && console.log(`📤 Sent: "${message}"`);
    return await this.pollForResponse();
  }

  async pollForResponse(maxAttempts = 25, delayMs = 700) {
    for (let i = 0; i < maxAttempts; i++) {
      await new Promise((r) => setTimeout(r, delayMs));

      const url = this.watermark
        ? `${this.endpoint}/conversations/${this.conversationId}/activities?watermark=${encodeURIComponent(this.watermark)}`
        : `${this.endpoint}/conversations/${this.conversationId}/activities`;

      const resp = await fetch(url, {
        headers: { Authorization: `Bearer ${this.token}` },
      });

      if (!resp.ok) continue;

      const data = await resp.json();
      this.watermark = data.watermark;

      const activities = Array.isArray(data.activities) ? data.activities : [];
      const botMessages = activities.filter(
        (a) => a.type === "message" && a.from?.id && a.from.id !== this.userId
      );

      if (!botMessages.length) continue;

      const latest = botMessages[botMessages.length - 1];

      // Deduplicate
      if (latest.id && latest.id === this.lastBotActivityId) continue;
      if (latest.id) this.lastBotActivityId = latest.id;

      return latest.text || "";
    }

    throw new Error("Timeout waiting for Copilot response.");
  }
}
