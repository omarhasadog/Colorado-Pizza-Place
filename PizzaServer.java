package com.coloradopizza;

import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpServer;
import java.io.IOException;
import java.io.OutputStream;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;

public class PizzaServer {
    private static final int PORT = 8080;
    private final MenuService menuService = new MenuService();
    private final OrderCalculator calculator = new OrderCalculator();

    public static void main(String[] args) throws Exception {
        new PizzaServer().start();
    }

    public void start() throws IOException {
        HttpServer server = HttpServer.create(new InetSocketAddress(PORT), 0);
        //web pages
        server.createContext("/", this::home);
        server.createContext("/api/menu", this::menu);
        server.createContext("/api/toppings", this::toppings);
        server.createContext("/health", this::health);
        //static files
        server.createContext("/style.css", exchange -> staticFile(exchange, "style.css", "text/css"));
        server.createContext("/app.js", exchange -> staticFile(exchange, "app.js", "application/javascript"));
        server.setExecutor(null);
        server.start();

        System.out.println("Colorado Pizza Place is running at http://localhost:" + PORT);
    }

    private void home(HttpExchange exchange) throws IOException {
        if (!exchange.getRequestMethod().equalsIgnoreCase("GET")) {
            send(exchange, 405, "Method Not Allowed", "text/plain");
            return;
        }
        staticFile(exchange, "index.html", "text/html");
    }

    private void staticFile(HttpExchange exchange, String name, String contentType) throws IOException {
        if (!exchange.getRequestMethod().equalsIgnoreCase("GET")) {
            send(exchange, 405, "Method Not Allowed", "text/plain");
            return;
        }
        Path file = Path.of(name);

        if (!Files.exists(file)) {
            send(exchange, 404, "Not Found", "text/plain");
            return;
        }

            String content = Files.readString(file, StandardCharsets.UTF_8);
            send(exchange, 200, content, contentType);
    }

    private void menu(HttpExchange exchange) throws IOException {
        if (!exchange.getRequestMethod().equalsIgnoreCase("GET")){
            send(exchange, 405, "Method Not Allowed", "text/plain");
            return;
        }
        StringBuilder json = new StringBuilder("[");
        List<Pizza> pizzas = menuService.getPizzas();
        for (int i = 0; i < pizzas.size(); i++) {
            Pizza pizza = pizzas.get(i);
            if (i > 0) {
                json.append(',');
            }
            json.append("{")
                    .append("\"id\":")
                    .append(pizza.id())

                    .append(",\"name\":\"")
                    .append(escape(pizza.name()))

                    .append("\",\"description\":\"")
                    .append(escape(pizza.description()))

                    .append("\",\"basePrice\":")
                    .append(pizza.basePrice())

                    .append(",\"toppings\":[\"");

            List<String> toppings = pizza.toppings();
            for (int j = 0; j < toppings.size(); j++) {
                if (j > 0) {
                    json.append("\",\"");
                }
                json.append(
                        escape(toppings.get(j))
                );
            }
            json.append("\"]}");
        }
        json.append("]");
        send(exchange, 200, json.toString(), "application/json");
    }

    private void toppings(HttpExchange exchange) throws IOException{
        if (!exchange.getRequestMethod().equalsIgnoreCase("GET")) {
            send(exchange, 405, "Method Not Allowed", "text/plain");
            return;
        }
        StringBuilder json = new StringBuilder();
        json.append("{");
        //Meat Toppings
        json.append("\"meat\":[");
        appendList(json, MenuService.getMeatToppings());
        json.append("],");

        //Veggie Toppings
        json.append("\"veggie\":[");
        appendList(json, MenuService.getVeggieToppings());
        json.append("],");

        //Cheese Toppings
        json.append("\"cheese\":[");
        appendList(json, MenuService.getCheeseToppings());
        json.append("]");
        json.append("}");

        send(exchange, 200, json.toString(), "application/json");
    }

    private void appendList(StringBuilder json, List<String> items){
        for (int i = 0; i < items.size(); i++) {
            if (i>0) {
                json.append(",");
            }
            json.append("\"")
                    .append(escape(items.get(i)))
                    .append("\"");
        }
    }

    private void health(HttpExchange exchange) throws IOException {
        if (!exchange.getRequestMethod().equalsIgnoreCase("GET")){
            send(exchange, 405, "Method Not Allowed", "text/plain");
            return;
        }
        send(exchange, 200, "{\"status\":\"UP\"}", "application/json");
    }

    private String escape(String value) {
        return value.replace("\\", "\\\\").replace("\"", "\\\"");
    }

    private void send(HttpExchange exchange, int status, String body, String contentType) throws IOException {
        byte[] bytes = body.getBytes(StandardCharsets.UTF_8);
        exchange.getResponseHeaders().set("Content-Type", contentType + "; charset=UTF-8");
        exchange.sendResponseHeaders(status, bytes.length);
        try (OutputStream output = exchange.getResponseBody()) {
            output.write(bytes);
        }
    }
}
