package com.chatcall.app;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
  @Override
  public void onCreate(Bundle savedInstanceState) {
    super.onCreate(savedInstanceState);
    // Phone-er system font boro thakleo app-er lekha WhatsApp-er moto ek size-e thakbe
    getBridge().getWebView().getSettings().setTextZoom(100);
  }
}
