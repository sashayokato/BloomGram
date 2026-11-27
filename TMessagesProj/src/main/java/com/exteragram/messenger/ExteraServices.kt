/*

 This is the source code of BloomGram for Android.

 We do not and cannot prevent the use of our code,
 but be respectful and credit the original author.

 Copyright @BloomGram, 2022-2026

 Licensed under the GNU GPL v. 3 or later, with the additional terms
 in ADDITIONAL_TERMS.md at the root of the repository.

*/

@file:JvmName("ExteraServices")

package com.BloomGram.messenger

import com.BloomGram.messenger.adblock.backend.AdBlockManager
import com.BloomGram.messenger.api.ApiController
import com.BloomGram.messenger.icons.IconManager
import com.BloomGram.messenger.plugins.PluginsConstants
import com.BloomGram.messenger.plugins.PluginsController
import com.BloomGram.messenger.utils.network.RemoteUtils
import org.telegram.messenger.ApplicationLoader
import java.util.concurrent.atomic.AtomicBoolean

private val servicesStarted = AtomicBoolean(false)

internal fun startServices() {
    if (!servicesStarted.compareAndSet(false, true)) return
    ApiController.init()
    RemoteUtils.init()
    PluginsController.getInstance().init(pluginsSafeMode) {
        PluginsController.getInstance().executeOnAppEvent(PluginsConstants.APP_START)
        if (!ApplicationLoader.mainInterfacePaused) {
            PluginsController.getInstance().executeOnAppEvent(PluginsConstants.APP_RESUME)
        }
    }
    AdBlockManager.preload()
    IconManager.prefetchCustomPacks()
}
