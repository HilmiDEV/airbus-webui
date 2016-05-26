package com.geomatys.poc.wui.ogc;

/**
 * Proxy server to bypass cross origin issue
 * Vert.x applications require Java 8.
 *
 * @author Mehdi Sidhoum (Geomatys).
 */

import io.vertx.core.AbstractVerticle;
import org.apache.http.HttpHost;
import org.apache.http.auth.AuthScope;
import org.apache.http.auth.UsernamePasswordCredentials;
import org.apache.http.client.CredentialsProvider;
import org.apache.http.client.config.RequestConfig;
import org.apache.http.client.methods.CloseableHttpResponse;
import org.apache.http.client.methods.HttpGet;
import org.apache.http.impl.client.BasicCredentialsProvider;
import org.apache.http.impl.client.CloseableHttpClient;
import org.apache.http.impl.client.HttpClients;
import org.apache.http.util.EntityUtils;

import java.io.IOException;
import java.net.MalformedURLException;
import java.net.URL;

public class ProxyServerApache extends AbstractVerticle {

    static String proxyHost = System.getProperty("http.proxyHost");
    static String proxyPort = System.getProperty("http.proxyPort");
    static String proxyUser = System.getProperty("http.proxyUser");
    static String proxyPassword = System.getProperty("http.proxyPassword");

    private static RequestConfig getConf() {
        RequestConfig config = null;
        if (proxyHost != null && !proxyHost.isEmpty() && proxyPort != null && !proxyPort.isEmpty()) {
            HttpHost proxy = new HttpHost(proxyHost, Integer.parseInt(proxyPort));
            config = RequestConfig.custom().setProxy(proxy).build();
        }
        return config;
    }

    private static CloseableHttpClient getClient() {
        CloseableHttpClient httpclient;
        if (proxyHost != null && !proxyHost.isEmpty() && proxyPort != null && !proxyPort.isEmpty()) {
            CredentialsProvider credsProvider = new BasicCredentialsProvider();
            credsProvider.setCredentials(
                    new AuthScope(proxyHost, Integer.parseInt(proxyPort)),
                    new UsernamePasswordCredentials(proxyUser, proxyPassword));
            httpclient = HttpClients.custom().setDefaultCredentialsProvider(credsProvider).build();
        } else {
            httpclient = HttpClients.createDefault();
        }
        return httpclient;
    }

    public void start() {

        RequestConfig config = getConf();


        vertx.createHttpServer().requestHandler(req -> {
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


            try {
                HttpHost httpHostTarget = new HttpHost(targetHost, targetPort);
                HttpGet request = new HttpGet(targetReqURI);
                if (config != null) {
                    request.setConfig(config);
                    System.out.println("Executing request " + request.getRequestLine() + " to " + target + " via " + proxyHost);
                }

                final CloseableHttpClient httpClient = getClient();
                CloseableHttpResponse response = httpClient.execute(httpHostTarget, request);
                try {
                    req.response().setStatusCode(response.getStatusLine().getStatusCode());
                    req.response().putHeader("Access-Control-Allow-Origin", "*");
                    req.response().setChunked(true);
                    req.response().end(EntityUtils.toString(response.getEntity()));

                } finally {
                    response.close();
                    httpClient.close();
                }
            } catch (IOException ioe) {
                ioe.printStackTrace();

            }

        }).listen(8080);
    }
}
