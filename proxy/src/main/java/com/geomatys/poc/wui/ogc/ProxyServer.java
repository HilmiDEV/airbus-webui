package com.geomatys.poc.wui.ogc;

/**
 * Proxy server to bypass cross origin issue
 * Vert.x applications require Java 8.
 *
 * @author Mehdi Sidhoum (Geomatys).
 */
import io.vertx.core.AbstractVerticle;
import io.vertx.core.Handler;
import io.vertx.core.VoidHandler;
import io.vertx.core.buffer.Buffer;
import io.vertx.core.http.HttpClient;
import io.vertx.core.http.HttpClientOptions;
import io.vertx.core.http.HttpClientResponse;
import io.vertx.core.http.HttpServerRequest;

import java.net.MalformedURLException;
import java.net.URL;

public class ProxyServer extends AbstractVerticle {

    public void start()  {
        vertx.createHttpServer().requestHandler(new Handler<HttpServerRequest>() {
            public void handle(final HttpServerRequest req) {
                System.out.println("\n\n**************ProxyServer****************");
                System.out.println("Proxying request: " + req.uri());
                String target = req.getParam("target");
                System.out.println("decode target: " + target);
                if (target == null) {
                    req.response().end();
                    return;
                }
                int targetPort = 80;
                String targetHost = "localhost";
                String targetReqURI = "";
                try {
                    URL targetURL = new URL(target);
                    targetPort = targetURL.getPort() < 0 ? 80 : targetURL.getPort();
                    targetHost = targetURL.getHost();
                    targetReqURI = targetURL.getFile() != null ? targetURL.getFile() : "";
                } catch (MalformedURLException ex) {
                    ex.printStackTrace();
                }

                final HttpClient client = vertx.createHttpClient(new HttpClientOptions());

                client.getNow( targetPort, targetHost, targetReqURI, new Handler<HttpClientResponse>() {
                    public void handle(HttpClientResponse cRes) {
                        System.out.println("Proxying response: " + cRes.statusCode());
                        req.response().setStatusCode(cRes.statusCode());
                        req.response().headers().setAll(cRes.headers());
                        req.response().putHeader("Access-Control-Allow-Origin", "*");
                        req.response().setChunked(true);
                        cRes.handler(new Handler<Buffer>() {
                            public void handle(Buffer data) {
                                //System.out.println("Proxying response body:" + data);
                                req.response().write(data);
                            }
                        });
                        cRes.endHandler(new VoidHandler() {
                            public void handle() {
                                req.response().end();
                            }
                        });
                    }
                });

            }
        }).listen(8080);
    }
}
