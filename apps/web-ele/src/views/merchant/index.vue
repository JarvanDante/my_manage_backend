<script lang="ts" setup>
import { onMounted, reactive, ref } from "vue";

import {
  ElButton,
  ElCard,
  ElDialog,
  ElForm,
  ElFormItem,
  ElInput,
  ElMessage,
  ElMessageBox,
  ElOption,
  ElPagination,
  ElSelect,
  ElTable,
  ElTableColumn,
  ElTag,
} from "element-plus";

import {
  createMerchantApi,
  getMerchantListApi,
  type MerchantApi,
  setMerchantStatusApi,
  updateMerchantApi,
} from "#/api/core/merchant";

defineOptions({ name: "MerchantManage" });

const loading = ref(false);
const tableData = ref<MerchantApi.MerchantItem[]>([]);
const pagination = reactive({ current: 1, pageSize: 20, total: 0 });
const searchForm = reactive({ keyword: "", status: 0 });
const statusOptions = [
  { label: "全部", value: 0 },
  { label: "启用", value: 1 },
  { label: "停用", value: 2 },
];

async function fetchList() {
  loading.value = true;
  try {
    const res = await getMerchantListApi({
      keyword: searchForm.keyword || undefined,
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

function handleReset() {
  searchForm.keyword = "";
  searchForm.status = 0;
  handleSearch();
}

// ---------- 新建/编辑 ----------
const dialogVisible = ref(false);
const dialogTitle = ref("新建商户");
const saving = ref(false);
const formRef = ref();
const form = reactive<MerchantApi.SaveParams>({
  id: undefined,
  name: "",
  contact: "",
  phone: "",
  remark: "",
});
const rules = {
  name: [{ required: true, message: "商户名必填", trigger: "blur" }],
};

function openCreate() {
  dialogTitle.value = "新建商户";
  Object.assign(form, { id: undefined, name: "", contact: "", phone: "", remark: "" });
  dialogVisible.value = true;
}

function openEdit(row: MerchantApi.MerchantItem) {
  dialogTitle.value = `编辑商户 #${row.id}`;
  Object.assign(form, {
    id: row.id,
    name: row.name,
    contact: row.contact,
    phone: row.phone,
    remark: row.remark,
  });
  dialogVisible.value = true;
}

async function handleSave() {
  await formRef.value?.validate();
  saving.value = true;
  try {
    if (form.id) {
      await updateMerchantApi(form);
      ElMessage.success("更新成功");
    } else {
      await createMerchantApi(form);
      ElMessage.success("创建成功");
    }
    dialogVisible.value = false;
    fetchList();
  } finally {
    saving.value = false;
  }
}

// ---------- 启停 ----------
async function handleToggleStatus(row: MerchantApi.MerchantItem) {
  const next = row.status === 1 ? 0 : 1;
  const action = next === 1 ? "启用" : "停用";
  await ElMessageBox.confirm(
    `确认${action}商户「${row.name}」?` +
      (next === 0 ? " 名下仍有未停用站点时会被拒绝。" : ""),
    "提示",
    { type: "warning" }
  );
  await setMerchantStatusApi(row.id, next);
  ElMessage.success(`${action}成功`);
  fetchList();
}

onMounted(fetchList);
</script>

<template>
  <div class="p-5">
    <ElCard shadow="never">
      <div class="mb-4 flex flex-wrap items-center gap-3">
        <ElInput
          v-model="searchForm.keyword"
          placeholder="商户名/联系人"
          clearable
          style="width: 220px"
          @keyup.enter="handleSearch"
        />
        <ElSelect v-model="searchForm.status" style="width: 120px">
          <ElOption
            v-for="o in statusOptions"
            :key="o.value"
            :label="o.label"
            :value="o.value"
          />
        </ElSelect>
        <ElButton type="primary" @click="handleSearch">查询</ElButton>
        <ElButton @click="handleReset">重置</ElButton>
        <div class="flex-1"></div>
        <ElButton type="primary" @click="openCreate">新建商户</ElButton>
      </div>

      <ElTable v-loading="loading" :data="tableData" border stripe>
        <ElTableColumn prop="id" label="ID" width="70" />
        <ElTableColumn prop="name" label="商户名" min-width="140" />
        <ElTableColumn prop="contact" label="联系人" width="120" />
        <ElTableColumn prop="phone" label="电话/微信" width="140" />
        <ElTableColumn label="状态" width="90" align="center">
          <template #default="{ row }">
            <ElTag :type="row.status === 1 ? 'success' : 'danger'">
              {{ row.status === 1 ? "启用" : "停用" }}
            </ElTag>
          </template>
        </ElTableColumn>
        <ElTableColumn prop="remark" label="备注" min-width="120" show-overflow-tooltip />
        <ElTableColumn prop="created_at" label="创建时间" width="170" />
        <ElTableColumn label="操作" width="160" fixed="right">
          <template #default="{ row }">
            <ElButton link type="primary" @click="openEdit(row)">编辑</ElButton>
            <ElButton
              link
              :type="row.status === 1 ? 'danger' : 'success'"
              @click="handleToggleStatus(row)"
            >
              {{ row.status === 1 ? "停用" : "启用" }}
            </ElButton>
          </template>
        </ElTableColumn>
      </ElTable>

      <div class="mt-4 flex justify-end">
        <ElPagination
          v-model:current-page="pagination.current"
          v-model:page-size="pagination.pageSize"
          :total="pagination.total"
          :page-sizes="[10, 20, 50, 100]"
          layout="total, sizes, prev, pager, next"
          @size-change="handleSearch"
          @current-change="fetchList"
        />
      </div>
    </ElCard>

    <ElDialog v-model="dialogVisible" :title="dialogTitle" width="480px">
      <ElForm ref="formRef" :model="form" :rules="rules" label-width="80px">
        <ElFormItem label="商户名" prop="name">
          <ElInput v-model="form.name" placeholder="唯一, 必填" />
        </ElFormItem>
        <ElFormItem label="联系人">
          <ElInput v-model="form.contact" />
        </ElFormItem>
        <ElFormItem label="电话/微信">
          <ElInput v-model="form.phone" />
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
