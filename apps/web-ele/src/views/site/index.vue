<script lang="ts" setup>
import { nextTick, onMounted, reactive, ref } from "vue";
import { useRouter } from "vue-router";

import {
  ElButton,
  ElCard,
  ElDialog,
  ElForm,
  ElFormItem,
  ElInput,
  ElInputNumber,
  ElMessage,
  ElOption,
  ElPagination,
  ElSelect,
  ElTable,
  ElTableColumn,
  ElTag,
} from "element-plus";

import { getMerchantListApi, type MerchantApi } from "#/api/core/merchant";
import {
  createSiteApi,
  getSiteListApi,
  type SiteApi,
  updateSiteApi,
} from "#/api/core/site";

defineOptions({ name: "SiteManage" });

const router = useRouter();
const loading = ref(false);
const tableData = ref<SiteApi.SiteItem[]>([]);
const pagination = reactive({ current: 1, pageSize: 20, total: 0 });
const searchForm = reactive({ keyword: "", env: "", status: -1 });

const envOptions = [
  { label: "全部环境", value: "" },
  { label: "dev", value: "dev" },
  { label: "test", value: "test" },
  { label: "prod", value: "prod" },
];
const statusOptions = [
  { label: "全部状态", value: -1 },
  { label: "筹备", value: 0 },
  { label: "上线", value: 1 },
  { label: "停用", value: 2 },
];
const statusTag: Record<number, { label: string; type: "info" | "success" | "danger" }> = {
  0: { label: "筹备", type: "info" },
  1: { label: "上线", type: "success" },
  2: { label: "停用", type: "danger" },
};

async function fetchList() {
  loading.value = true;
  try {
    const res = await getSiteListApi({
      keyword: searchForm.keyword || undefined,
      env: searchForm.env || undefined,
      status: searchForm.status,
      page: pagination.current,
      size: pagination.pageSize,
    });
    tableData.value = res.list || [];
    pagination.total = res.total || 0;
  } finally {
    loading.value = false;
  }
}

function handleSearch() {
  pagination.current = 1;
  fetchList();
}

function goDetail(row: SiteApi.SiteItem) {
  router.push({ path: "/site/detail", query: { id: row.id } });
}

// ---------- 新建/编辑 ----------
const dialogVisible = ref(false);
const isEdit = ref(false);
const saving = ref(false);
const formRef = ref();
const merchants = ref<MerchantApi.MerchantItem[]>([]);
const form = reactive<SiteApi.SaveParams>({
  id: undefined,
  merchant_id: undefined as unknown as number,
  site_code: "",
  name: "",
  env: "",
  db_host: "127.0.0.1",
  db_port: 5432,
  db_name: "",
  db_user: "",
  db_pass: "",
  remark: "",
});
const rules = {
  merchant_id: [
    { required: true, message: "请选择商户", trigger: "change" },
    {
      validator: (_: any, v: number, cb: any) =>
        v > 0 ? cb() : cb(new Error("请选择商户")),
      trigger: "change",
    },
  ],
  site_code: [
    { required: true, message: "site_code 必填", trigger: "blur" },
    {
      pattern: /^[A-Z]{2,32}$/,
      message: "2~32位大写英文字母(不含数字与特殊符号)",
      trigger: "blur",
    },
  ],
  name: [{ required: true, message: "站点名必填", trigger: "blur" }],
  env: [{ required: true, message: "请选择环境", trigger: "change" }],
  db_host: [{ required: true, message: "必填", trigger: "blur" }],
  db_name: [{ required: true, message: "必填", trigger: "blur" }],
  db_user: [{ required: true, message: "必填", trigger: "blur" }],
  db_pass: [
    {
      validator: (_: any, v: string, cb: any) => {
        if (!isEdit.value && !v) {
          cb(new Error("请填写 DB 密码"));
          return;
        }
        cb();
      },
      trigger: "blur",
    },
  ],
};

async function loadMerchants() {
  const res = await getMerchantListApi({ status: 1, page: 1, size: 100 });
  merchants.value = res.list || [];
}

function openCreate() {
  isEdit.value = false;
  Object.assign(form, {
    id: undefined,
    merchant_id: undefined,
    site_code: "",
    name: "",
    env: "",
    db_host: "127.0.0.1",
    db_port: 5432,
    db_name: "",
    db_user: "",
    db_pass: "",
    remark: "",
  });
  loadMerchants();
  dialogVisible.value = true;
  nextTick(() => formRef.value?.clearValidate());
}

function openEdit(row: SiteApi.SiteItem) {
  isEdit.value = true;
  Object.assign(form, {
    id: row.id,
    merchant_id: row.merchant_id,
    site_code: row.site_code,
    name: row.name,
    env: row.env,
    db_host: row.db_host,
    db_port: row.db_port,
    db_name: row.db_name,
    db_user: row.db_user,
    db_pass: "",
    remark: row.remark,
  });
  loadMerchants();
  dialogVisible.value = true;
}

async function handleSave() {
  await formRef.value?.validate();
  saving.value = true;
  try {
    if (isEdit.value) {
      await updateSiteApi(form);
      ElMessage.success("更新成功(密码留空未修改)");
    } else {
      await createSiteApi(form);
      ElMessage.success("创建成功");
    }
    dialogVisible.value = false;
    fetchList();
  } finally {
    saving.value = false;
  }
}

onMounted(fetchList);
</script>

<template>
  <div class="p-5">
    <ElCard shadow="never">
      <div class="mb-4 flex flex-wrap items-center gap-3">
        <ElInput
          v-model="searchForm.keyword"
          placeholder="site_code / 站点名"
          clearable
          style="width: 200px"
          @keyup.enter="handleSearch"
        />
        <ElSelect v-model="searchForm.env" style="width: 120px">
          <ElOption v-for="o in envOptions" :key="o.value" :label="o.label" :value="o.value" />
        </ElSelect>
        <ElSelect v-model="searchForm.status" style="width: 120px">
          <ElOption v-for="o in statusOptions" :key="o.value" :label="o.label" :value="o.value" />
        </ElSelect>
        <ElButton type="primary" @click="handleSearch">查询</ElButton>
        <div class="flex-1"></div>
        <ElButton type="primary" @click="openCreate">创建站点</ElButton>
      </div>

      <ElTable v-loading="loading" :data="tableData" border stripe>
        <ElTableColumn prop="id" label="ID" width="60" />
        <ElTableColumn prop="site_code" label="site_code" width="120">
          <template #default="{ row }">
            <ElButton link type="primary" @click="goDetail(row)">
              {{ row.site_code }}
            </ElButton>
          </template>
        </ElTableColumn>
        <ElTableColumn prop="name" label="站点名" min-width="120" />
        <ElTableColumn prop="merchant_name" label="所属商户" min-width="120" />
        <ElTableColumn prop="env" label="环境" width="70" align="center" />
        <ElTableColumn label="状态" width="80" align="center">
          <template #default="{ row }">
            <ElTag :type="statusTag[row.status]?.type">
              {{ statusTag[row.status]?.label }}
            </ElTag>
          </template>
        </ElTableColumn>
        <ElTableColumn label="站点库" min-width="200">
          <template #default="{ row }">
            {{ row.db_host }}:{{ row.db_port }}/{{ row.db_name }}
          </template>
        </ElTableColumn>
        <ElTableColumn prop="created_at" label="创建时间" width="170" />
        <ElTableColumn label="操作" width="140" fixed="right">
          <template #default="{ row }">
            <ElButton link type="primary" @click="goDetail(row)">详情</ElButton>
            <ElButton link type="primary" @click="openEdit(row)">编辑</ElButton>
          </template>
        </ElTableColumn>
      </ElTable>

      <div class="mt-4 flex justify-end">
        <ElPagination
          v-model:current-page="pagination.current"
          v-model:page-size="pagination.pageSize"
          :total="pagination.total"
          layout="total, sizes, prev, pager, next"
          @size-change="handleSearch"
          @current-change="fetchList"
        />
      </div>
    </ElCard>

    <ElDialog
      v-model="dialogVisible"
      :title="isEdit ? `编辑站点 ${form.site_code}` : '创建站点'"
      width="560px"
    >
      <ElForm ref="formRef" :model="form" :rules="rules" label-width="110px">
        <ElFormItem label="所属商户" prop="merchant_id">
          <ElSelect
            v-model="form.merchant_id"
            placeholder="请选择"
            clearable
            style="width: 100%"
          >
            <ElOption v-for="m in merchants" :key="m.id" :label="m.name" :value="m.id" />
          </ElSelect>
        </ElFormItem>
        <ElFormItem label="site_code" prop="site_code">
          <ElInput
            v-model="form.site_code"
            :disabled="isEdit"
            placeholder="唯一站点码, 创建后不可改(如 MY / DEMO)"
            @blur="form.site_code = String(form.site_code || '').trim().toUpperCase()"
          />
        </ElFormItem>
        <ElFormItem label="站点名" prop="name">
          <ElInput v-model="form.name" placeholder="如 漫隐" />
        </ElFormItem>
        <ElFormItem label="环境" prop="env">
          <ElSelect v-model="form.env" placeholder="请选择" clearable style="width: 100%">
            <ElOption label="dev" value="dev" />
            <ElOption label="test" value="test" />
            <ElOption label="prod" value="prod" />
          </ElSelect>
        </ElFormItem>
        <ElFormItem label="DB 主机" prop="db_host">
          <div class="flex w-full gap-2">
            <ElInput v-model="form.db_host" class="flex-1" />
            <ElInputNumber v-model="form.db_port" :min="1" :max="65535" :controls="false" style="width: 100px" />
          </div>
        </ElFormItem>
        <ElFormItem label="DB 库名" prop="db_name">
          <ElInput v-model="form.db_name" placeholder="站点独立库, 需已手动建库跑迁移" />
        </ElFormItem>
        <ElFormItem label="DB 账号" prop="db_user">
          <ElInput v-model="form.db_user" />
        </ElFormItem>
        <ElFormItem label="DB 密码" prop="db_pass" :required="!isEdit">
          <ElInput
            v-model="form.db_pass"
            type="password"
            show-password
            :placeholder="isEdit ? '留空表示不修改' : '请输入 DB 密码'"
          />
        </ElFormItem>
        <ElFormItem label="备注">
          <ElInput v-model="form.remark" type="textarea" :rows="2" />
        </ElFormItem>
      </ElForm>
      <template #footer>
        <ElButton @click="dialogVisible = false">取消</ElButton>
        <ElButton type="primary" :loading="saving" @click="handleSave">保存</ElButton>
      </template>
    </ElDialog>
  </div>
</template>
