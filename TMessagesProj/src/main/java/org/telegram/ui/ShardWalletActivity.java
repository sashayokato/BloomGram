package org.telegram.ui;

import android.app.Activity;
import android.app.AlertDialog;
import android.content.ClipData;
import android.content.ClipboardManager;
import android.content.Context;
import android.os.Bundle;
import android.view.ViewGroup;
import android.widget.Button;
import android.widget.EditText;
import android.widget.LinearLayout;
import android.widget.ScrollView;
import android.widget.TextView;
import android.widget.Toast;

import org.telegram.messenger.AndroidUtilities;
import org.telegram.messenger.LocaleController;
import org.telegram.messenger.R;

import java.io.IOException;
import java.util.concurrent.TimeUnit;

import okhttp3.MediaType;
import okhttp3.OkHttpClient;
import okhttp3.Request;
import okhttp3.RequestBody;
import okhttp3.Response;

/** First BloomGram SHD slice: balance, catalog and unsigned BOC operations. */
public class ShardWalletActivity extends Activity {

    private static final String BACKEND = "http://10.0.2.2:8787";
    private static final String OWNER = "EQBLrmtj2C4bJR1v9Wg_CW8GO5Y0NDX9grw9JzbxbQm3XGjp";

    private static final OkHttpClient HTTP = new OkHttpClient.Builder()
            .connectTimeout(10, TimeUnit.SECONDS)
            .readTimeout(20, TimeUnit.SECONDS)
            .build();
    private static final MediaType JSON = MediaType.parse("application/json; charset=utf-8");

    private TextView infoView;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setTitle(LocaleController.getString(R.string.ShardWalletTitle));

        ScrollView scroll = new ScrollView(this);
        LinearLayout root = new LinearLayout(this);
        root.setOrientation(LinearLayout.VERTICAL);
        int pad = AndroidUtilities.dp(16);
        root.setPadding(pad, pad, pad, pad);
        scroll.addView(root, new ScrollView.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT));

        infoView = new TextView(this);
        infoView.setTextSize(15);
        root.addView(infoView);

        addButton(root, R.string.ShardBuyGift, () -> postJson("/shop/buy", "{\"kind\":\"gift\"}"));
        addButton(root, R.string.ShardBuyNumber, () -> ask("+9991234567", value ->
                postJson("/shop/buy", "{\"kind\":\"number\",\"payload\":\"" + escape(value) + "\"}")));
        addButton(root, R.string.ShardBuyUsername, () -> ask("bloom", value ->
                postJson("/shop/buy", "{\"kind\":\"username\",\"payload\":\"" + escape(value) + "\"}")));
        addButton(root, R.string.ShardUpgradeNft, () -> ask("1", value ->
                postJson("/nft/" + value.trim() + "/upgrade", "{}")));
        addButton(root, R.string.ShardGiftNft, () -> askTwo("1", OWNER, (id, to) ->
                postJson("/nft/" + id + "/gift", "{\"to\":\"" + escape(to) + "\"}")));
        addButton(root, R.string.ShardRefresh, this::load);

        setContentView(scroll);
        load();
    }

    private interface Runnable0 { void run(); }
    private interface ValueCallback { void onValue(String value); }
    private interface TwoCallback { void onValues(String a, String b); }

    private void addButton(LinearLayout root, int textRes, Runnable0 click) {
        Button b = new Button(this);
        b.setText(LocaleController.getString(textRes));
        b.setOnClickListener(v -> click.run());
        root.addView(b);
    }

    private void ask(String hint, ValueCallback cb) {
        EditText input = new EditText(this);
        input.setHint(hint);
        new AlertDialog.Builder(this)
                .setTitle(LocaleController.getString(R.string.ShardInputTitle))
                .setView(input)
                .setPositiveButton(LocaleController.getString(R.string.ShardOk), (d, w) -> cb.onValue(input.getText().toString()))
                .setNegativeButton(LocaleController.getString(R.string.ShardCancel), null)
                .show();
    }

    private void askTwo(String hintA, String hintB, TwoCallback cb) {
        EditText a = new EditText(this);
        EditText b = new EditText(this);
        a.setHint(hintA);
        b.setHint(hintB);
        LinearLayout box = new LinearLayout(this);
        box.setOrientation(LinearLayout.VERTICAL);
        box.addView(a);
        box.addView(b);
        new AlertDialog.Builder(this)
                .setTitle(LocaleController.getString(R.string.ShardInputTitle))
                .setView(box)
                .setPositiveButton(LocaleController.getString(R.string.ShardOk), (d, w) -> cb.onValues(a.getText().toString(), b.getText().toString()))
                .setNegativeButton(LocaleController.getString(R.string.ShardCancel), null)
                .show();
    }

    private void load() {
        infoView.setText(LocaleController.getString(R.string.ShardLoading));
        new Thread(() -> {
            String text;
            try {
                String health = get("/health");
                String wallet = get("/wallet/" + OWNER);
                String catalog = get("/catalog");
                text = health + "\n\n" + wallet + "\n\n" + catalog;
            } catch (Exception e) {
                text = "Backend error: " + e.getMessage();
            }
            final String result = text;
            runOnUiThread(() -> infoView.setText(result));
        }, "shard-load").start();
    }

    private void postJson(String path, String body) {
        new Thread(() -> {
            String result;
            try {
                Request req = new Request.Builder()
                        .url(BACKEND + path)
                        .post(RequestBody.create(body, JSON))
                        .build();
                try (Response resp = HTTP.newCall(req).execute()) {
                    result = resp.body() != null ? resp.body().string() : "empty";
                }
            } catch (Exception e) {
                result = "Error: " + e.getMessage();
            }
            final String value = result;
            runOnUiThread(() -> new AlertDialog.Builder(this)
                    .setTitle(LocaleController.getString(R.string.ShardUnsignedBoc))
                    .setMessage(value)
                    .setNeutralButton(LocaleController.getString(R.string.ShardCopy), (d, w) -> {
                        ClipboardManager cm = (ClipboardManager) getSystemService(Context.CLIPBOARD_SERVICE);
                        cm.setPrimaryClip(ClipData.newPlainText("shard", value));
                        Toast.makeText(this, LocaleController.getString(R.string.ShardCopied), Toast.LENGTH_SHORT).show();
                    })
                    .setPositiveButton(LocaleController.getString(R.string.ShardOk), null)
                    .show());
        }, "shard-post").start();
    }

    private static String get(String path) throws IOException {
        Request req = new Request.Builder().url(BACKEND + path).build();
        try (Response resp = HTTP.newCall(req).execute()) {
            return resp.body() != null ? resp.body().string() : "empty";
        }
    }

    private static String escape(String s) {
        return s.replace("\\", "\\\\").replace("\"", "\\\"");
    }
}
