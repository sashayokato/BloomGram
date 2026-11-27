/*

 This is the source code of BloomGram for Android.

 We do not and cannot prevent the use of our code,
 but be respectful and credit the original author.

 Copyright @BloomGram, 2022-2026

 Licensed under the GNU GPL v. 3 or later, with the additional terms
 in ADDITIONAL_TERMS.md at the root of the repository.

*/

package com.BloomGram.messenger.ai.network.backend;

import androidx.annotation.NonNull;
import androidx.annotation.Nullable;

import com.BloomGram.messenger.ai.data.Message;
import com.BloomGram.messenger.ai.data.Role;
import com.BloomGram.messenger.ai.data.Service;

import java.util.List;

public record BackendRequest(
        @NonNull Service service,
        @Nullable Role role,
        @NonNull List<Message> history,
        @NonNull Message currentMessage,
        boolean stream,
        float temperature,
        int maxOutputTokens
) {
}
