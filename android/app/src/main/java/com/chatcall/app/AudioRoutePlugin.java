package com.chatcall.app;

import android.content.Context;
import android.media.AudioManager;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

// Call-er shomoy awaj speaker/kan-e pathano
@CapacitorPlugin(name = "AudioRoute")
public class AudioRoutePlugin extends Plugin {

  private AudioManager am() {
    return (AudioManager) getContext().getSystemService(Context.AUDIO_SERVICE);
  }

  @PluginMethod
  public void setSpeaker(PluginCall call) {
    boolean on = call.getBoolean("on", true);
    AudioManager a = am();
    a.setMode(AudioManager.MODE_IN_COMMUNICATION);
    a.setSpeakerphoneOn(on);
    call.resolve();
  }

  @PluginMethod
  public void reset(PluginCall call) {
    AudioManager a = am();
    a.setSpeakerphoneOn(false);
    a.setMode(AudioManager.MODE_NORMAL);
    call.resolve();
  }
}
