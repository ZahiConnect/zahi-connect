const TARGET = "http://k8s-default-gateway-fe9eb21d44-ce2b82c57f5c31ef.elb.ap-south-1.amazonaws.com";

export const config = { api: { bodyParser: false } };

export default async function handler(req, res) {
  const path = req.url.replace(/^\/api/, "") || "/";
  const targetUrl = `${TARGET}${path}`;

  const body = await new Promise((resolve) => {
    const chunks = [];
    req.on("data", (chunk) => chunks.push(chunk));
    req.on("end", () => resolve(Buffer.concat(chunks)));
  });

  const forwardHeaders = {};
  ["content-type", "authorization", "cookie", "x-zahi-portal"].forEach((h) => {
    if (req.headers[h]) forwardHeaders[h] = req.headers[h];
  });

  const response = await fetch(targetUrl, {
    method: req.method,
    headers: forwardHeaders,
    body: ["GET", "HEAD"].includes(req.method) ? undefined : body,
  });

  response.headers.forEach((value, key) => {
    if (key.toLowerCase() !== "transfer-encoding") {
      res.setHeader(key, value);
    }
  });

  res.status(response.status);
  const data = Buffer.from(await response.arrayBuffer());
  res.send(data);
}
