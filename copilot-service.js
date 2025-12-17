/**
 * Copilot Service Module
 * ======================
 * Direct Line v3 client for Copilot Studio / Bot Framework.
 *
 * IMPORTANT:
 * - Use Copilot Studio Web channel security "Secret 1" or "Secret 2" as DIRECT_LINE_SECRET
 * - Do NOT expose secrets in production frontend; use a backend token broker.
 */

class CopilotService {
    constructor() {
      this.directLineSecret = (CONFIG.DIRECT_LINE_SECRET || "").trim();
      this.endpoint = this.normalizeDirectLineEndpoint(CONFIG.DIRECT_LINE_ENDPOINT);
      this.token = null;
      this.conversationId = null;
      this.watermark = null;
      this.isConnected = false;
  
      // Stable IDs (avoid mismatches in polling filter)
      this.userId = (CONFIG.DIRECT_LINE_USER_ID || "user").trim();
      this.botId = (CONFIG.DIRECT_LINE_BOT_ID || "bot").trim();
  
      // Optional: keep track of last activity timestamp to reduce duplicates
      this.lastBotActivityId = null;
    }
  
    normalizeDirectLineEndpoint(endpoint) {
      const raw = (endpoint || "https://directline.botframework.com").trim();
      // If they provided full v3 path, keep it; otherwise append it.
      if (raw.includes("/v3/directline")) return raw.replace(/\/+$/, "");
      return raw.replace(/\/+$/, "") + "/v3/directline";
    }
  
    assertConfigured() {
      if (!this.directLineSecret) {
        throw new Error(
          "DIRECT_LINE_SECRET is empty/undefined. Paste Copilot Studio Web channel security Secret 1/2 into CONFIG.DIRECT_LINE_SECRET."
        );
      }
      if (!this.endpoint.startsWith("https://")) {
        throw new Error(
          `DIRECT_LINE_ENDPOINT must be https. Current: ${this.endpoint}`
        );
      }
    }
  
    async startConversation() {
      this.assertConfigured();
  
      try {
        // 1) Generate a Direct Line token using the SECRET
        const tokenResponse = await fetch(`${this.endpoint}/tokens/generate`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${this.directLineSecret}`,
          },
        });
  
        if (!tokenResponse.ok) {
          const body = await this.safeJson(tokenResponse);
          throw new Error(
            `Failed to get token (${tokenResponse.status}). ${this.formatErrorBody(body)}`
          );
        }
  
        const tokenData = await tokenResponse.json();
        if (!tokenData?.token) {
          throw new Error("Token generate succeeded but no token was returned.");
        }
        this.token = tokenData.token;
  
        // 2) Start a conversation using the TOKEN
        const conversationResponse = await fetch(`${this.endpoint}/conversations`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${this.token}`,
            "Content-Type": "application/json",
          },
        });
  
        if (!conversationResponse.ok) {
          const body = await this.safeJson(conversationResponse);
          throw new Error(
            `Failed to start conversation (${conversationResponse.status}). ${this.formatErrorBody(body)}`
          );
        }
  
        const conversationData = await conversationResponse.json();
        if (!conversationData?.conversationId) {
          throw new Error("Conversation start succeeded but no conversationId returned.");
        }
  
        this.conversationId = conversationData.conversationId;
        this.watermark = null;
        this.isConnected = true;
        this.lastBotActivityId = null;
  
        if (CONFIG.DEBUG) {
          console.log("✅ Direct Line conversation started:", {
            endpoint: this.endpoint,
            conversationId: this.conversationId,
          });
        }
  
        return true;
      } catch (error) {
        this.isConnected = false;
        console.error("Failed to start Copilot conversation:", error);
        throw error;
      }
    }
  
    async sendMessage(message) {
      if (!message || !message.trim()) return "";
  
      // If not connected, start
      if (!this.isConnected || !this.conversationId || !this.token) {
        await this.startConversation();
      }
  
      try {
        // Send message
        const sendResponse = await fetch(
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
  
        if (sendResponse.status === 401 || sendResponse.status === 403) {
          // Token expired or invalid: restart conversation
          if (CONFIG.DEBUG) console.warn("Auth failure sending message; restarting conversation.");
          await this.restartConversation();
          return await this.sendMessage(message);
        }
  
        if (!sendResponse.ok) {
          const body = await this.safeJson(sendResponse);
          throw new Error(
            `Failed to send message (${sendResponse.status}). ${this.formatErrorBody(body)}`
          );
        }
  
        if (CONFIG.DEBUG) console.log(`📤 Sent: "${message}"`);
  
        // Poll for bot response
        return await this.pollForResponse();
      } catch (error) {
        console.error("Failed to send message to Copilot:", error);
        throw error;
      }
    }
  
    async pollForResponse(maxAttempts = 20, delayMs = 750) {
      for (let attempt = 0; attempt < maxAttempts; attempt++) {
        await this.delay(delayMs);
  
        const url = this.watermark
          ? `${this.endpoint}/conversations/${this.conversationId}/activities?watermark=${encodeURIComponent(this.watermark)}`
          : `${this.endpoint}/conversations/${this.conversationId}/activities`;
  
        try {
          const response = await fetch(url, {
            headers: { Authorization: `Bearer ${this.token}` },
          });
  
          if (response.status === 401 || response.status === 403) {
            if (CONFIG.DEBUG) console.warn("Auth failure polling; restarting conversation.");
            await this.restartConversation();
            throw new Error("Token expired while polling; conversation restarted.");
          }
  
          if (!response.ok) continue;
  
          const data = await response.json();
          this.watermark = data.watermark;
  
          const activities = Array.isArray(data.activities) ? data.activities : [];
  
          // Bot messages are those not from userId
          const botMessages = activities.filter(
            (a) => a.type === "message" && a.from?.id && a.from.id !== this.userId
          );
  
          if (botMessages.length > 0) {
            const latest = botMessages[botMessages.length - 1];
  
            // De-dup if the same activity is seen again
            if (latest.id && latest.id === this.lastBotActivityId) continue;
            if (latest.id) this.lastBotActivityId = latest.id;
  
            const responseText = latest.text || "";
            if (CONFIG.DEBUG) console.log(`📥 Response: "${responseText}"`);
            return responseText;
          }
        } catch (err) {
          if (CONFIG.DEBUG) console.warn("Poll attempt error:", err?.message || err);
        }
      }
  
      throw new Error("Timeout waiting for Copilot response.");
    }
  
    async refreshToken() {
      if (!this.token) return;
  
      const response = await fetch(`${this.endpoint}/tokens/refresh`, {
        method: "POST",
        headers: { Authorization: `Bearer ${this.token}` },
      });
  
      if (response.ok) {
        const data = await response.json();
        if (data?.token) this.token = data.token;
        if (CONFIG.DEBUG) console.log("🔄 Token refreshed");
        return;
      }
  
      // If refresh fails, restart
      if (CONFIG.DEBUG) console.warn("Token refresh failed; restarting conversation.");
      await this.restartConversation();
    }
  
    async restartConversation() {
      await this.endConversation();
      await this.startConversation();
    }
  
    async endConversation() {
      this.conversationId = null;
      this.watermark = null;
      this.token = null;
      this.isConnected = false;
      this.lastBotActivityId = null;
      if (CONFIG.DEBUG) console.log("🔚 Conversation ended");
    }
  
    getIsConnected() {
      return this.isConnected;
    }
  
    delay(ms) {
      return new Promise((resolve) => setTimeout(resolve, ms));
    }
  
    async safeJson(response) {
      try {
        return await response.json();
      } catch {
        return null;
      }
    }
  
    formatErrorBody(body) {
      if (!body) return "";
      if (typeof body === "string") return body;
      if (body.error?.message) return `Message: ${body.error.message}`;
      if (body.message) return `Message: ${body.message}`;
      return `Body: ${JSON.stringify(body)}`;   
    }
  }
  