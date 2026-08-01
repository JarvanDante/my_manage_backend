<script lang="ts" setup>
import { onMounted, reactive, ref } from "vue";

import {
  ElButton,
  ElCard,
  ElInput,
  ElOption,
  ElPagination,
  ElSelect,
  ElTable,
  ElTableColumn,
  ElTag,
} from "element-plus";

import { getManageLogsApi, type MonitorApi } from "#/api/core/monitor";

defineOptions({ name: "ManageLogs" });

const loading = ref(false);
const tableData = ref<MonitorApi.LogItem[]>([]);
const pagination = reactive({ current: 1, pageSize: 20, total: 0 });
const searchForm = reactive({ method: "", keyword: "" });

const methodTag: Record<string, "success" | "warning" | "danger"> = {
  POST: "success",
  PUT: "warning",
  DELETE: "danger",
};

async function fetchList() {
  loading.value = true;
  try {
    const res = await getManageLogsApi({
      method: searchForm.method || undefined,
      keyword: searchForm.keyword || undefined,
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

onMounted(fetchList);
</script>

<template>
  <div class="p-5">
    <ElCard shadow="never">
      <div class="mb-4 flex flex-wrap items-center gap-3">
        <ElSelect v-model="searchForm.method" style="width: 130px" placeholder="方法">
          <ElOption label="全部方法" value="" />
          <ElOption label="POST" value="POST" />
          <ElOption label="PUT" value="PUT" />
          <ElOption label="DELETE" value="DELETE" />
        </ElSelect>
        <ElInput
          v-model="searchForm.keyword"
          placeholder="路径关键字, 如 /manage/sites"
          clearable
          style="width: 240px"
          @keyup.enter="handleSearch"
        />
        <ElButton type="primary" @click="handleSearch">查询</ElButton>
      </div>

      <ElTable v-loading="loading" :data="tableData" border stripe>
        <ElTableColumn prop="id" label="ID" width="80" />
        <ElTableColumn prop="username" label="管理员" width="110" />
        <ElTableColumn label="方法" width="90" align="center">
          <template #default="{ row }">
            <ElTag :type="methodTag[row.method] || 'info'" size="small">
              {{ row.method }}
            </ElTag>
          </template>
        </ElTableColumn>
        <ElTableColumn prop="path" label="路径" min-width="260" show-overflow-tooltip />
        <ElTableColumn prop="ip" label="IP" width="130" />
        <ElTableColumn prop="created_at" label="时间" width="170" />
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
  </div>
</template>
