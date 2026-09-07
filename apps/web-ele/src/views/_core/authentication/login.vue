<script lang="ts" setup>
import type { VbenFormSchema } from "@vben/common-ui";
import type { Recordable } from "@vben/types";

import { computed, ref } from "vue";

import { AuthenticationLogin, z } from "@vben/common-ui";
import { $t } from "@vben/locales";

import { useAuthStore } from "#/store";

defineOptions({ name: "Login" });

const authStore = useAuthStore();

const totpStep = ref<"none" | "bind" | "verify">("none");
const totpQr = ref("");
const totpSecret = ref("");
const totpCode = ref("");
const checkedUsername = ref("");

const formSchema = computed((): VbenFormSchema[] => {
  const locked = totpStep.value !== "none";
  return [
    {
      component: "VbenInput",
      componentProps: {
        placeholder: $t("authentication.usernameTip"),
        disabled: locked,
      },
      fieldName: "username",
      label: $t("authentication.username"),
      rules: z.string().min(1, { message: $t("authentication.usernameTip") }),
    },
    {
      component: "VbenInputPassword",
      componentProps: {
        placeholder: $t("authentication.passwordTip"),
        disabled: locked,
      },
      fieldName: "password",
      label: $t("authentication.password"),
      rules: z.string().min(1, { message: $t("authentication.passwordTip") }),
    },
  ];
});

function resetTotp() {
  totpStep.value = "none";
  totpQr.value = "";
  totpSecret.value = "";
  totpCode.value = "";
  checkedUsername.value = "";
}

async function handleSubmit(values: Recordable<any>) {
  const username = String(values?.username ?? "");
  if (checkedUsername.value && username !== checkedUsername.value) {
    resetTotp();
  }
  const result = await authStore.authLogin({
    username,
    password: values?.password,
    totp_code: totpCode.value.trim(),
  });
  if (result.totp) {
    checkedUsername.value = username;
    totpStep.value = result.totp.bound ? "verify" : "bind";
    totpQr.value = result.totp.qr;
    totpSecret.value = result.totp.secret;
    totpCode.value = "";
  }
}
</script>

<template>
  <AuthenticationLogin
    :form-schema="formSchema"
    :loading="authStore.loginLoading"
    @submit="handleSubmit"
  >
    <template #extra>
      <div v-if="totpStep !== 'none'" class="mb-4">
        <div
          v-if="totpStep === 'bind'"
          class="border-border mb-4 rounded-md border p-3 text-center"
        >
          <p class="text-muted-foreground mb-2 text-sm">
            {{ $t("authentication.totpBindTip") }}
          </p>
          <img
            v-if="totpQr"
            :src="totpQr"
            alt="Google Authenticator"
            class="mx-auto h-44 w-44"
          />
          <p class="text-muted-foreground mt-2 break-all text-xs">
            {{ $t("authentication.totpSecretLabel") }} {{ totpSecret }}
          </p>
        </div>
        <p
          v-else
          class="text-muted-foreground mb-2 text-center text-sm"
        >
          {{ $t("authentication.totpVerifyTip") }}
        </p>
        <input
          v-model="totpCode"
          autocomplete="one-time-code"
          autofocus
          class="border-input bg-background ring-offset-background placeholder:text-muted-foreground focus-visible:ring-ring flex h-10 w-full rounded-md border px-3 py-2 text-center text-sm tracking-[0.4em] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
          inputmode="numeric"
          maxlength="6"
          :placeholder="$t('authentication.totpCodePlaceholder')"
        />
        <button
          class="text-muted-foreground mt-2 w-full text-center text-xs"
          type="button"
          @click="resetTotp"
        >
          更换账号
        </button>
      </div>
    </template>
  </AuthenticationLogin>
</template>
