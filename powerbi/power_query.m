// 使用说明：以下每一段分别建立为一个 Power Query 查询。
// 先在“管理参数”中建立文本参数 pDataPath，值指向：
// <仓库目录>\data\processed\account_segments.csv

// ===== Query: 账户投放 =====
let
    Source = Csv.Document(
        File.Contents(pDataPath),
        [Delimiter = ",", Encoding = 65001, QuoteStyle = QuoteStyle.Csv]
    ),
    PromotedHeaders = Table.PromoteHeaders(Source, [PromoteAllScalars = true]),
    Typed = Table.TransformColumnTypes(
        PromotedHeaders,
        {
            {"month_date", type date}, {"account_id", type text},
            {"account_name", type text}, {"brand_name", type text},
            {"impressions", Int64.Type}, {"clicks", Int64.Type}, {"plays", Int64.Type},
            {"platform_spend", type number}, {"actual_spend", type number},
            {"mixed_revenue_24h", type number}, {"mixed_roi_recalc", type number},
            {"ctr_recalc", type number}, {"cpc_recalc", type number},
            {"cpm_recalc", type number}, {"play_cost_recalc", type number},
            {"play_rate_recalc", type number}, {"is_eligible", type logical},
            {"is_high_spend", type logical}, {"action_segment", type text}
        },
        "zh-CN"
    ),
    PublicColumns = Table.SelectColumns(
        Typed,
        {
            "month_date", "account_id", "account_name", "brand_name",
            "impressions", "clicks", "plays", "platform_spend", "actual_spend",
            "mixed_revenue_24h", "mixed_roi_recalc", "ctr_recalc", "cpc_recalc",
            "cpm_recalc", "play_cost_recalc", "play_rate_recalc", "is_eligible",
            "is_high_spend", "action_segment"
        }
    )
in
    PublicColumns

// ===== Query: 品牌（右键“账户投放”→ 引用，再粘贴高级编辑器内容） =====
let
    Source = 账户投放,
    Selected = Table.SelectColumns(Source, {"brand_name"}),
    DistinctRows = Table.Distinct(Selected),
    Renamed = Table.RenameColumns(DistinctRows, {{"brand_name", "品牌"}}),
    AddedKey = Table.AddIndexColumn(Renamed, "品牌键", 1, 1, Int64.Type)
in
    AddedKey

// ===== Query: 账号 =====
let
    Source = 账户投放,
    Selected = Table.SelectColumns(Source, {"account_id", "account_name", "brand_name"}),
    DistinctRows = Table.Distinct(Selected)
in
    DistinctRows

// ===== Query: 日期 =====
let
    Source = 账户投放,
    MinDate = Date.StartOfMonth(List.Min(Source[month_date])),
    MaxDate = Date.EndOfMonth(List.Max(Source[month_date])),
    Dates = List.Dates(MinDate, Duration.Days(MaxDate - MinDate) + 1, #duration(1, 0, 0, 0)),
    ToTable = Table.FromList(Dates, Splitter.SplitByNothing(), {"日期"}),
    Typed = Table.TransformColumnTypes(ToTable, {{"日期", type date}}),
    AddMonth = Table.AddColumn(Typed, "年月", each Date.ToText([日期], "yyyy-MM"), type text)
in
    AddMonth

// 建模提醒：数据只有 2026-07 单月。日期表用于规范模型，不得据此制造趋势结论。
