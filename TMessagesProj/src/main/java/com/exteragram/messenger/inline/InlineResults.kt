/*

 This is the source code of BloomGram for Android.

 We do not and cannot prevent the use of our code,
 but be respectful and credit the original author.

 Copyright @BloomGram, 2022-2026

 Licensed under the GNU GPL v. 3 or later, with the additional terms
 in ADDITIONAL_TERMS.md at the root of the repository.

*/

package com.BloomGram.messenger.inline

import com.BloomGram.messenger.AngleUnit
import com.BloomGram.messenger.MeasureSystem
import com.BloomGram.messenger.inline.math.MathOptions
import com.BloomGram.messenger.inline.time.TimeZoneOptions
import com.BloomGram.messenger.inlineAngleUnit
import com.BloomGram.messenger.inlineCurrencyRates
import com.BloomGram.messenger.inlineDigitGrouping
import com.BloomGram.messenger.inlineMathResult
import com.BloomGram.messenger.inlineMeasureSystem
import com.BloomGram.messenger.inlineResults
import com.BloomGram.messenger.inlineTimeZones
import com.BloomGram.messenger.inlineUnitConversion

import org.telegram.messenger.LocaleController

import java.time.ZoneId

object InlineResults {

    private val imperialRegions = setOf("US", "LR", "MM")

    fun isImperial(): Boolean = when (inlineMeasureSystem) {
        MeasureSystem.AUTO -> LocaleController.getInstance().systemDefaultLocale?.country in imperialRegions
        MeasureSystem.METRIC -> false
        MeasureSystem.IMPERIAL -> true
    }

    fun isEnabled(): Boolean =
        inlineResults && (inlineMathResult || inlineCurrencyRates || inlineUnitConversion || inlineTimeZones)

    fun options(rates: InlineRates, decimalSeparator: Char, allFeatures: Boolean = false): MathOptions {
        val currencies = allFeatures || inlineCurrencyRates
        return MathOptions(
            decimalSeparator,
            if (currencies) rates else null,
            if (currencies) rates.localCurrency() else null,
            allFeatures || inlineMathResult,
            allFeatures || inlineUnitConversion,
            inlineAngleUnit == AngleUnit.DEGREES,
            inlineDigitGrouping,
            if (allFeatures || inlineTimeZones) TimeZoneOptions(ZoneId.systemDefault(), places = InlineZonePlaces::lookup) else null,
            isImperial()
        )
    }
}
