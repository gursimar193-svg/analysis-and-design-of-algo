package com.inventory.knapsack;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Lightweight, zero-dependency JSON parser and serializer for stdin/stdout IPC.
 */
public class JsonHelper {

    private final String src;
    private int pos = 0;

    private JsonHelper(String src) {
        this.src = src;
    }

    public static Object parse(String json) {
        JsonHelper p = new JsonHelper(json.trim());
        return p.readValue();
    }

    private void skipWhitespace() {
        while (pos < src.length() && Character.isWhitespace(src.charAt(pos))) {
            pos++;
        }
    }

    private Object readValue() {
        skipWhitespace();
        if (pos >= src.length()) throw new IllegalArgumentException("Unexpected end of JSON");
        char ch = src.charAt(pos);
        if (ch == '{') return readObject();
        if (ch == '[') return readArray();
        if (ch == '"') return readString();
        if (ch == 't' || ch == 'f') return readBoolean();
        if (ch == 'n') {
            pos += 4;
            return null;
        }
        return readNumber();
    }

    private Map<String, Object> readObject() {
        Map<String, Object> map = new LinkedHashMap<>();
        pos++; // '{'
        skipWhitespace();
        if (pos < src.length() && src.charAt(pos) == '}') {
            pos++;
            return map;
        }
        while (pos < src.length()) {
            skipWhitespace();
            String key = readString();
            skipWhitespace();
            if (src.charAt(pos) != ':') throw new IllegalArgumentException("Expected ':' at " + pos);
            pos++;
            Object val = readValue();
            map.put(key, val);
            skipWhitespace();
            if (pos < src.length() && src.charAt(pos) == ',') {
                pos++;
            } else if (pos < src.length() && src.charAt(pos) == '}') {
                pos++;
                break;
            } else {
                throw new IllegalArgumentException("Malformed object at " + pos);
            }
        }
        return map;
    }

    private List<Object> readArray() {
        List<Object> list = new ArrayList<>();
        pos++; // '['
        skipWhitespace();
        if (pos < src.length() && src.charAt(pos) == ']') {
            pos++;
            return list;
        }
        while (pos < src.length()) {
            list.add(readValue());
            skipWhitespace();
            if (pos < src.length() && src.charAt(pos) == ',') {
                pos++;
            } else if (pos < src.length() && src.charAt(pos) == ']') {
                pos++;
                break;
            } else {
                throw new IllegalArgumentException("Malformed array at " + pos);
            }
        }
        return list;
    }

    private String readString() {
        pos++; // '"'
        StringBuilder sb = new StringBuilder();
        while (pos < src.length()) {
            char c = src.charAt(pos++);
            if (c == '"') return sb.toString();
            if (c == '\\' && pos < src.length()) {
                char esc = src.charAt(pos++);
                switch (esc) {
                    case '"': sb.append('"'); break;
                    case '\\': sb.append('\\'); break;
                    case '/': sb.append('/'); break;
                    case 'b': sb.append('\b'); break;
                    case 'f': sb.append('\f'); break;
                    case 'n': sb.append('\n'); break;
                    case 'r': sb.append('\r'); break;
                    case 't': sb.append('\t'); break;
                    case 'u':
                        String hex = src.substring(pos, pos + 4);
                        sb.append((char) Integer.parseInt(hex, 16));
                        pos += 4;
                        break;
                    default: sb.append(esc);
                }
            } else {
                sb.append(c);
            }
        }
        throw new IllegalArgumentException("Unterminated string");
    }

    private Boolean readBoolean() {
        if (src.startsWith("true", pos)) {
            pos += 4;
            return Boolean.TRUE;
        }
        if (src.startsWith("false", pos)) {
            pos += 5;
            return Boolean.FALSE;
        }
        throw new IllegalArgumentException("Invalid boolean at " + pos);
    }

    private Number readNumber() {
        int start = pos;
        while (pos < src.length()) {
            char c = src.charAt(pos);
            if (Character.isDigit(c) || c == '-' || c == '+' || c == '.' || c == 'e' || c == 'E') {
                pos++;
            } else {
                break;
            }
        }
        return Double.parseDouble(src.substring(start, pos));
    }

    public static String escape(String s) {
        if (s == null) return "null";
        StringBuilder sb = new StringBuilder("\"");
        for (int i = 0; i < s.length(); i++) {
            char c = s.charAt(i);
            switch (c) {
                case '"': sb.append("\\\""); break;
                case '\\': sb.append("\\\\"); break;
                case '\b': sb.append("\\b"); break;
                case '\f': sb.append("\\f"); break;
                case '\n': sb.append("\\n"); break;
                case '\r': sb.append("\\r"); break;
                case '\t': sb.append("\\t"); break;
                default:
                    if (c < 0x20) {
                        sb.append(String.format("\\u%04x", (int) c));
                    } else {
                        sb.append(c);
                    }
            }
        }
        sb.append("\"");
        return sb.toString();
    }

    private static String num(double val) {
        if (Double.isInfinite(val)) return "\"Infinity\"";
        if (Double.isNaN(val)) return "0";
        if (val == Math.rint(val) && Math.abs(val) < 1e15) {
            return Long.toString((long) val);
        }
        return Double.toString(val);
    }

    public static String serializeResult(KnapsackResult r, boolean includeDpPreview) {
        StringBuilder sb = new StringBuilder();
        sb.append("{");
        sb.append("\"algorithm\":").append(escape(r.algorithm)).append(",");
        sb.append("\"engine\":").append(escape(r.engine)).append(",");
        sb.append("\"timeComplexity\":").append(escape(r.timeComplexity)).append(",");
        sb.append("\"spaceComplexity\":").append(escape(r.spaceComplexity)).append(",");
        sb.append("\"capacity\":").append(num(r.capacity)).append(",");
        sb.append("\"totalItemsEvaluated\":").append(r.totalItemsEvaluated).append(",");
        sb.append("\"selectedCount\":").append(r.selectedCount).append(",");
        sb.append("\"fullCount\":").append(r.fullCount).append(",");
        sb.append("\"partialCount\":").append(r.partialCount).append(",");
        sb.append("\"totalWeight\":").append(num(r.totalWeight)).append(",");
        sb.append("\"totalProfit\":").append(num(r.totalProfit)).append(",");
        sb.append("\"utilizationPct\":").append(num(r.utilizationPct)).append(",");
        sb.append("\"executionTimeMs\":").append(num(r.executionTimeMs)).append(",");

        if (!includeDpPreview) {
            sb.append("\"greedyZeroOneHeuristic\":{");
            sb.append("\"totalProfit\":").append(num(r.greedy01HeuristicProfit)).append(",");
            sb.append("\"totalWeight\":").append(num(r.greedy01HeuristicWeight));
            sb.append("},");
        } else {
            sb.append("\"scaledCapacity\":").append(r.scaledCapacity).append(",");
            sb.append("\"scaleFactor\":").append(r.scaleFactor).append(",");
            sb.append("\"dpStatesComputed\":").append(r.dpStatesComputed).append(",");
        }

        sb.append("\"selections\":[");
        for (int i = 0; i < r.selections.size(); i++) {
            KnapsackResult.SelectionEntry s = r.selections.get(i);
            if (i > 0) sb.append(",");
            sb.append("{");
            sb.append("\"id\":").append(escape(s.id)).append(",");
            sb.append("\"name\":").append(escape(s.name)).append(",");
            sb.append("\"category\":").append(escape(s.category)).append(",");
            sb.append("\"weight\":").append(num(s.weight)).append(",");
            sb.append("\"profit\":").append(num(s.profit)).append(",");
            sb.append("\"ratio\":").append(num(s.ratio)).append(",");
            sb.append("\"fraction\":").append(num(s.fraction)).append(",");
            sb.append("\"takenWeight\":").append(num(s.takenWeight)).append(",");
            sb.append("\"earnedProfit\":").append(num(s.earnedProfit)).append(",");
            sb.append("\"decision\":").append(escape(s.decision));
            sb.append("}");
        }
        sb.append("]");

        if (r.trace != null) {
            sb.append(",\"trace\":[");
            for (int i = 0; i < r.trace.size(); i++) {
                KnapsackResult.TraceStep t = r.trace.get(i);
                if (i > 0) sb.append(",");
                sb.append("{");
                sb.append("\"step\":").append(t.step).append(",");
                sb.append("\"itemId\":").append(escape(t.itemId)).append(",");
                sb.append("\"itemName\":").append(escape(t.itemName)).append(",");
                sb.append("\"ratio\":").append(num(t.ratio)).append(",");
                sb.append("\"decision\":").append(escape(t.decision)).append(",");
                sb.append("\"fraction\":").append(num(t.fraction)).append(",");
                sb.append("\"remainingCapacityAfter\":").append(num(t.remainingCapacityAfter));
                sb.append("}");
            }
            sb.append("]");
        }

        if (includeDpPreview && r.dpRowIndices != null) {
            sb.append(",\"dpTablePreview\":{");
            sb.append("\"sampled\":").append(r.dpSampled).append(",");
            sb.append("\"totalRows\":").append(r.dpTotalRows).append(",");
            sb.append("\"totalCols\":").append(r.dpTotalCols).append(",");
            sb.append("\"rowIndices\":").append(intArray(r.dpRowIndices)).append(",");
            sb.append("\"colIndices\":").append(intArray(r.dpColIndices)).append(",");
            sb.append("\"cells\":[");
            for (int ri = 0; ri < r.dpRowIndices.length; ri++) {
                if (ri > 0) sb.append(",");
                sb.append("[");
                for (int ci = 0; ci < r.dpColIndices.length; ci++) {
                    if (ci > 0) sb.append(",");
                    sb.append("{");
                    sb.append("\"row\":").append(r.dpRowIndices[ri]).append(",");
                    sb.append("\"col\":").append(r.dpColIndices[ci]).append(",");
                    sb.append("\"value\":").append(num(r.dpPreviewValues[ri][ci])).append(",");
                    sb.append("\"onOptimalPath\":").append(r.dpPreviewOnPath[ri][ci]);
                    sb.append("}");
                }
                sb.append("]");
            }
            sb.append("]}");
        }

        sb.append("}");
        return sb.toString();
    }

    private static String intArray(int[] arr) {
        StringBuilder sb = new StringBuilder("[");
        for (int i = 0; i < arr.length; i++) {
            if (i > 0) sb.append(",");
            sb.append(arr[i]);
        }
        sb.append("]");
        return sb.toString();
    }
}
