type Request = {
  path: string;
  query?: Record<string, string>;
  body?: unknown;
  headers?: Record<string, string>;
};

type HttpClientConfig = {
  baseUrl: string;
  headers?: Record<string, string>;
};

type Response<TResponse> = {
  data: TResponse;
  status: number;
};

export class HttpClient {
  public readonly baseUrl: string;
  public readonly headers: Record<string, string>;
  private cookies: Map<string, string>;

  private readonly origin: string;

  public constructor(config: HttpClientConfig) {
    this.baseUrl = config.baseUrl.replace(/\/$/, "");
    this.headers = config.headers ?? {};
    this.cookies = new Map();

    // Derive origin for CSRF protection (BetterAuth checks Origin header)
    const url = new URL(this.baseUrl);
    this.origin = url.origin;
  }

  private parseCookies(response: globalThis.Response): void {
    const setCookieHeaders = response.headers.getSetCookie();
    for (const header of setCookieHeaders) {
      const [cookiePair] = header.split(";");
      const eqIndex = cookiePair.indexOf("=");
      if (eqIndex === -1) continue;

      const name = cookiePair.substring(0, eqIndex).trim();
      const value = cookiePair.substring(eqIndex + 1).trim();

      // Remove cookies with empty value or Max-Age=0
      if (
        value === "" ||
        header.toLowerCase().includes("max-age=0") ||
        header.toLowerCase().includes("expires=thu, 01 jan 1970")
      ) {
        this.cookies.delete(name);
      } else {
        this.cookies.set(name, value);
      }
    }
  }

  private getCookieHeader(): string {
    const parts: string[] = [];
    for (const [name, value] of this.cookies) {
      parts.push(`${name}=${value}`);
    }
    return parts.join("; ");
  }

  private async request<TResponse>(
    method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE",
    req: Request,
  ): Promise<Response<TResponse>> {
    const cookieHeader = this.getCookieHeader();

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      Origin: this.origin,
      ...this.headers,
      ...req.headers,
    };

    if (cookieHeader) {
      headers["Cookie"] = cookieHeader;
    }

    const params = new URLSearchParams(req.query).toString();
    const url = `${this.baseUrl}${req.path}${params ? `?${params}` : ""}`;

    const response = await fetch(url, {
      method,
      headers,
      body: req.body ? JSON.stringify(req.body) : undefined,
      redirect: "manual",
    });

    this.parseCookies(response);

    const { status } = response;
    let data: TResponse;

    const contentType = response.headers.get("content-type");
    if (contentType?.includes("application/json")) {
      data = (await response.json()) as TResponse;
    } else {
      data = (await response.text()) as unknown as TResponse;
    }

    return { data, status };
  }

  public async get<TResponse>(req: Request) {
    return await this.request<TResponse>("GET", req);
  }

  public async post<TResponse>(req: Request) {
    return await this.request<TResponse>("POST", req);
  }

  public async patch<TResponse>(req: Request) {
    return await this.request<TResponse>("PATCH", req);
  }

  public async put<TResponse>(req: Request) {
    return await this.request<TResponse>("PUT", req);
  }

  public async delete<TResponse>(req: Request) {
    return await this.request<TResponse>("DELETE", req);
  }

  public clearCookies(): void {
    this.cookies.clear();
  }

  public clone(): HttpClient {
    const cloned = new HttpClient({
      baseUrl: this.baseUrl,
      headers: { ...this.headers },
    });
    for (const [name, value] of this.cookies) {
      cloned.cookies.set(name, value);
    }
    return cloned;
  }

  public hasCookies(): boolean {
    return this.cookies.size > 0;
  }
}
