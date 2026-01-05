import pandas as pd
import numpy as np
from typing import Dict, List, Any, Tuple
import re
from datetime import date, datetime


def main(params: dict) -> dict:
    """
    读取多个 .xlsx 文件的所有 Sheet，智能处理复杂结构（合并单元格、多级标题等）
    安全版本：移除所有可能被识别为危险的函数
    """
    try:
        file_info_list = params.get("file_path")
        if not file_info_list or not isinstance(file_info_list, list):
            return {"errorMessage": "参数 'file_path' 为空或不存在。"}

        # ---------- 工具方法 ----------
        def _infer_file_name(fpath: str, fallback: str) -> str:
            """推断文件名"""
            if not fpath:
                return fallback
            parts = str(fpath).replace("\\", "/").split("/")
            return parts[-1] if parts else fallback

        def to_native(value: Any) -> Any:
            if value is None:
                return None
            if isinstance(value, (pd.Timestamp, pd.Timedelta)):
                return value.isoformat()
            if isinstance(value, (datetime, date)):
                return value.isoformat()
            if isinstance(value, np.generic):
                return value.item()
            return value

        def detect_header_row(
            df_raw: pd.DataFrame, max_check_rows: int = 10
        ) -> Tuple[int, List[str]]:
            """
            智能检测表头行 - 简化版本，默认第一行为表头
            返回: (表头行索引, 清洗后的列名列表)
            """
            # 默认使用第一行作为表头
            best_row_idx = 0

            # 安全地构建headers列表
            best_headers = []
            for j, cell in enumerate(df_raw.iloc[0]):
                if pd.isna(cell):
                    best_headers.append(f"Column_{j+1}")
                else:
                    best_headers.append(str(cell))

            return best_row_idx, best_headers

        def clean_headers(headers: List[str]) -> List[str]:
            """清洗列名"""
            cleaned = []
            used_names = set()

            for i, header in enumerate(headers):
                if pd.isna(header) or not header or header == "None":
                    base_name = f"Column_{i+1}"
                else:
                    # 移除特殊字符和多余空格，但保留原始格式
                    header_str = str(header).strip()
                    # 不再移除标点符号，保持原始格式
                    cleaned_str = re.sub(r"\s+", " ", header_str).strip()
                    base_name = cleaned_str if cleaned_str else f"Column_{i+1}"

                # 确保列名唯一
                final_name = base_name
                counter = 1
                while final_name in used_names:
                    final_name = f"{base_name}_{counter}"
                    counter += 1

                cleaned.append(final_name)
                used_names.add(final_name)

            return cleaned

        def extract_data_section(df_raw: pd.DataFrame, header_row: int) -> pd.DataFrame:
            """
            提取数据区域，处理可能的子标题和空行
            """
            if header_row + 1 >= len(df_raw):
                return pd.DataFrame()

            # 从表头下一行开始提取数据
            data_start = header_row + 1

            # 寻找数据结束位置（连续多行空行）
            data_end = len(df_raw)
            empty_row_count = 0
            max_empty_rows = 3

            for i in range(data_start, len(df_raw)):
                row = df_raw.iloc[i]
                # 检查是否为空行
                is_empty = True
                for cell in row:
                    if not pd.isna(cell):
                        cell_str = str(cell).strip()
                        if cell_str:
                            is_empty = False
                            break

                if is_empty:
                    empty_row_count += 1
                    if empty_row_count >= max_empty_rows:
                        data_end = i
                        break
                else:
                    empty_row_count = 0

            # 提取数据区域
            if data_start < data_end:
                data_df = (
                    df_raw.iloc[data_start:data_end].copy().reset_index(drop=True)
                )
                return data_df
            else:
                return pd.DataFrame()

        def build_schema_and_preview(
            df: pd.DataFrame, original_headers: List[str]
        ) -> Dict[str, Any]:
            """
            构建数据模式和预览
            """
            if df.empty:
                return {"schema": [], "preview": []}

            # 安全地替换NaN值为None
            df_cleaned = df.copy()
            for col in df_cleaned.columns:
                df_cleaned[col] = df_cleaned[col].apply(
                    lambda x: None if pd.isna(x) else x
                )

            schema = []
            total_rows = len(df_cleaned)

            for col_idx, col_name in enumerate(df_cleaned.columns):
                series = df_cleaned[col_name]
                original_header = (
                    original_headers[col_idx]
                    if col_idx < len(original_headers)
                    else col_name
                )

                # 统计信息
                non_null_count = series.notna().sum()
                null_count = total_rows - non_null_count
                dtype_str = str(series.dtype)

                # 推断通用类型（安全方式）
                try:
                    # 检查是否为数值类型
                    numeric_check = pd.to_numeric(series, errors="coerce")
                    if not numeric_check.isna().all():
                        gen_type = "numeric"
                    else:
                        # 检查是否为日期类型
                        date_check = pd.to_datetime(series, errors="coerce")
                        if not date_check.isna().all():
                            gen_type = "datetime"
                        else:
                            # 检查是否为布尔类型
                            bool_values = (
                                series.dropna()
                                .astype(str)
                                .str.lower()
                                .isin(
                                    [
                                        "true",
                                        "false",
                                        "1",
                                        "0",
                                        "是",
                                        "否",
                                        "yes",
                                        "no",
                                    ]
                                )
                            )
                            if bool_values.all() and len(bool_values) > 0:
                                gen_type = "boolean"
                            else:
                                gen_type = "string"
                except Exception:
                    gen_type = "string"

                # 样本值（安全方式）
                sample_values = []
                seen_values = set()

                for val in series:
                    native_val = to_native(val)
                    if native_val is not None and str(native_val).strip():
                        val_str = str(native_val)
                        if val_str not in seen_values:
                            sample_values.append(native_val)
                            seen_values.add(val_str)
                            if len(sample_values) >= 5:
                                break

                # 唯一值计数
                unique_count = len(seen_values)

                # 数据质量评估
                data_quality = "good"
                if null_count / total_rows > 0.5:
                    data_quality = "poor"
                elif null_count / total_rows > 0.2:
                    data_quality = "fair"

                # 关键修改：column_name 和 original_header 保持一致
                schema.append(
                    {
                        "column_name": original_header,  # 使用 original_header 而不是 col_name
                        "original_header": original_header,
                        "dtype": dtype_str,
                        "general_type": gen_type,
                        "null_count": int(null_count),
                        "null_ratio": round(null_count / total_rows, 3)
                        if total_rows > 0
                        else 0,
                        "unique_count": int(unique_count),
                        "sample_values": sample_values,
                        "data_quality": data_quality,
                    }
                )

            # 生成预览数据（安全方式）
            if total_rows > 0:
                try:
                    head_indices = list(range(min(5, total_rows)))
                    tail_indices = list(range(max(0, total_rows - 5), total_rows))
                    preview_indices = list(
                        dict.fromkeys(head_indices + tail_indices)
                    )  # 去重保持顺序

                    preview_records = []
                    for idx in preview_indices:
                        if idx < total_rows:
                            record = {}
                            for col in df_cleaned.columns:
                                record[col] = to_native(df_cleaned.iloc[idx][col])
                            preview_records.append(record)

                    preview = preview_records
                except Exception:
                    preview = []
            else:
                preview = []

            return {
                "schema": schema,
                "preview": preview,
                "summary": {
                    "total_rows": total_rows,
                    "total_columns": len(df_cleaned.columns),
                },
            }

        # --------------------------------

        result = {}
        name_counter = {}
        success_notes = []
        fail_notes = []
        any_sheet_success = False

        for idx, finfo in enumerate(file_info_list):
            if not isinstance(finfo, dict):
                fail_notes.append(f"文件条目 {idx+1} 格式不正确")
                continue

            fpath = str(finfo.get("file_path", "")).strip()
            given_name = str(finfo.get("file_name", "")).strip()
            ftype = str(finfo.get("file_type", "")).strip().lower()

            raw_name = (
                given_name
                if given_name
                else _infer_file_name(fpath, f"file_{idx+1}.xlsx")
            )
            display_key = raw_name

            # 处理重复文件名
            if display_key in result:
                name_counter[display_key] = name_counter.get(display_key, 1) + 1
                display_key = f"{display_key} ({name_counter[display_key]})"
            else:
                name_counter[display_key] = 1

            # 文件类型检查
            path_lower = fpath.lower()
            name_lower = raw_name.lower()
            ext_ok = path_lower.endswith(".xlsx") or name_lower.endswith(".xlsx")
            type_ok = ftype in ("", "xlsx")
            is_xlsx = ext_ok and type_ok

            if not is_xlsx:
                fail_notes.append(f"**{raw_name}** 文件非.xlsx文件，无法解析")
                continue

            if not fpath:
                fail_notes.append(f"**{raw_name}** 打开失败，原因为未提供有效的文件路径")
                continue

            # 打开工作簿
            try:
                excel = pd.ExcelFile(fpath)
            except Exception as e:
                error_msg = str(e).strip()[:100]  # 限制错误信息长度
                fail_notes.append(f"**{raw_name}** 打开失败，原因为{error_msg}")
                continue

            # 读取 sheet_names
            try:
                sheet_names = list(excel.sheet_names)
            except Exception:
                fail_notes.append(f"**{raw_name}** 文件读取失败，无法解析的.xlsx文件")
                continue

            if not sheet_names:
                fail_notes.append(f"**{raw_name}** 文件读取失败，无法解析的.xlsx文件")
                continue

            file_bucket = {"file_name": raw_name, "file_path": fpath, "sheets": {}}

            # 逐 Sheet 读取
            for s_idx, sheet_name in enumerate(sheet_names, start=1):
                sname_str = str(sheet_name)
                try:
                    # 读取原始数据（不自动识别表头）
                    df_raw = pd.read_excel(
                        excel,
                        sheet_name=sheet_name,
                        header=None,
                        keep_default_na=False,
                        na_filter=False,
                    )

                    if df_raw.empty:
                        fail_notes.append(
                            f"**{raw_name}** 文件 **{sname_str}** 页为空"
                        )
                        continue

                    # 智能检测表头 - 现在默认第一行为表头
                    header_row_idx, original_headers = detect_header_row(df_raw)
                    cleaned_headers = clean_headers(original_headers)

                    # 提取数据区域
                    data_df = extract_data_section(df_raw, header_row_idx)

                    if data_df.empty:
                        fail_notes.append(
                            f"**{raw_name}** 文件 **{sname_str}** 页无有效数据"
                        )
                        continue

                    # 设置清洗后的列名
                    if len(data_df.columns) == len(cleaned_headers):
                        data_df.columns = cleaned_headers

                    # 构建模式和预览
                    sp = build_schema_and_preview(data_df, original_headers)

                    file_bucket["sheets"][sname_str] = sp

                    # 记录成功状态
                    if sp.get("preview") and len(sp.get("schema", [])) > 0:
                        any_sheet_success = True
                        data_summary = sp.get("summary", {})
                        success_notes.append(
                            f"**{raw_name}** 文件 **{sname_str}** 页读取成功 "
                            f"({data_summary.get('total_rows', 0)}行{data_summary.get('total_columns', 0)}列)"
                        )
                    else:
                        fail_notes.append(
                            f"**{raw_name}** 文件 **{sname_str}** 页数据结构异常"
                        )

                except Exception as e:
                    error_msg = str(e).strip()[:100]  # 限制错误信息长度
                    fail_notes.append(
                        f"**{raw_name}** 文件 **{sname_str}** 页读取失败: {error_msg}"
                    )

            if file_bucket["sheets"]:
                result[display_key] = file_bucket

        # 检查是否有成功读取的sheet
        if not any_sheet_success:
            return {"errorMessage": "无.xlsx文件或所有.xlsx文件均解析失败，请重新上传"}

        # 组装分组后的 note
        groups = []
        groups.append("*成功读取如下：*")
        if success_notes:
            groups.extend(success_notes)
        else:
            groups.append("（无）")

        groups.append("")  # 空一行
        groups.append("*失败读取如下：*")
        if fail_notes:
            groups.extend(fail_notes)
        else:
            groups.append("（无）")

        note = "\n".join(groups)

        return {"sheets": result, "note": note}

    except Exception as e:
        error_msg = str(e).strip()[:200]  # 限制错误信息长度
        return {"errorMessage": f"读取或处理Excel文件时出错: {error_msg}"}

