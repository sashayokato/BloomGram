package org.telegram.ui;

import android.app.Activity;
import android.content.ClipData;
import android.content.ClipboardManager;
import android.content.Context;
import android.os.Bundle;
import android.view.ViewGroup;
import android.widget.Button;
import android.widget.ScrollView;
import android.widget.TextView;

import org.telegram.messenger.R;

import java.io.PrintWriter;
import java.io.StringWriter;

public class CrashReportActivity extends Activity {

    private static volatile String errorText = "";

    public static void setError(Throwable error) {
        StringWriter sw = new StringWriter();
        error.printStackTrace(new PrintWriter(sw));
        errorText = sw.toString();
    }

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setTitle(R.string.CrashTitle);

        ScrollView scroll = new ScrollView(this);
        ViewGroup box = new android.widget.LinearLayout(this);
        box.setOrientation(android.widget.LinearLayout.VERTICAL);
        int pad = 32;
        box.setPadding(pad, pad, pad, pad);

        TextView hint = new TextView(this);
        hint.setText(R.string.CrashHint);
        box.addView(hint);

        TextView text = new TextView(this);
        text.setTextIsSelectable(true);
        text.setText(errorText.isEmpty() ? "Unknown error" : errorText);
        box.addView(text);

        Button copy = new Button(this);
        copy.setText(R.string.CrashCopy);
        copy.setOnClickListener(v -> {
            ClipboardManager cm = (ClipboardManager) getSystemService(Context.CLIPBOARD_SERVICE);
            cm.setPrimaryClip(ClipData.newPlainText("crash", text.getText().toString()));
            copy.setText(R.string.CrashCopied);
        });
        box.addView(copy);

        scroll.addView(box, new ScrollView.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT));
        setContentView(scroll);
    }
}
