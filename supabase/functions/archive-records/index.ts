import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
// --- CHANGED: Using npm: specifiers for better stability ---
import { JWT } from "npm:google-auth-library@9";
import { google } from "npm:googleapis@126";
import dayjs from "npm:dayjs@1";
import utc from "npm:dayjs@1/plugin/utc.js";
import timezone from "npm:dayjs@1/plugin/timezone.js";

// Fix for dayjs plugins in Deno/NPM interop
// @ts-ignore
dayjs.extend(utc.default || utc);
// @ts-ignore
dayjs.extend(timezone.default || timezone);

console.log("Archive Robot: Online");

serve(async (req) => {
  try {
    // 1. SETUP & AUTH
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error('Missing Auth Header');

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
      // Options removed: Now it uses full Service Role power!
    );

    // Get Secrets
    const serviceAccountStr = Deno.env.get('GOOGLE_SERVICE_ACCOUNT');
    const sheetId = Deno.env.get('GOOGLE_SHEET_ID');

    if (!serviceAccountStr || !sheetId) {
      throw new Error('Missing Secrets: GOOGLE_SERVICE_ACCOUNT or GOOGLE_SHEET_ID');
    }

    const serviceAccount = JSON.parse(serviceAccountStr);

    // 2. DETERMINE DATE RANGE
    const { targetDate } = await req.json().catch(() => ({})); 
    
    const dateObj = targetDate ? dayjs(targetDate) : dayjs().subtract(1, 'month');
    const startOfMonth = dateObj.startOf('month');
    const endOfMonth = dateObj.endOf('month');
    const monthName = startOfMonth.format('MMMM'); 

    console.log(`Processing archive for: ${monthName} (${startOfMonth.format('YYYY-MM-DD')} to ${endOfMonth.format('YYYY-MM-DD')})`);

    // 3. FETCH DATA FROM SUPABASE
    const { data: records, error: dbError } = await supabase
      .from('maintenances')
      .select('*')
      .gte('start_time', startOfMonth.toISOString())
      .lte('start_time', endOfMonth.toISOString())
      .order('start_time', { ascending: true });

    if (dbError) throw dbError;
    
    // Check if records exist
    if (!records || records.length === 0) {
      console.log(`No records found for ${monthName}`);
      return new Response(
        JSON.stringify({ success: true, message: `No records found for ${monthName}`, count: 0 }),
        { headers: { "Content-Type": "application/json" } }
      );
    }

    console.log(`Found ${records.length} records.`);

    // 4. FORMAT DATA FOR GOOGLE SHEETS
    const rows = records.map(r => [
      r.redmine_ticket || '-',
      r.provider || '-',
      r.type || '-',
      dayjs(r.start_time).tz("Asia/Shanghai").format('YYYY-MM-DD HH:mm'),
      r.status || '-',
      r.recorder || '-',
      r.completed_by || '-',    
      r.bo_deleted_by || '-'
    ]);

    // 5. PUSH TO GOOGLE SHEETS
    const client = new JWT({
      email: serviceAccount.client_email,
      key: serviceAccount.private_key,
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    const sheets = google.sheets({ version: 'v4', auth: client });

    // Append to the specific Tab (Month Name)
    await sheets.spreadsheets.values.append({
      spreadsheetId: sheetId,
      range: `${monthName}!A2`,
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: rows },
    });

    // 6. LOG THE PENDING ACTION IN DATABASE
    const { error: logError } = await supabase
      .from('archival_logs')
      .insert({
        period_start: startOfMonth.toISOString(),
        period_end: endOfMonth.toISOString(),
        month_name: monthName,
        record_count: records.length,
        status: 'PENDING_VERIFICATION',
        sheet_link: `https://docs.google.com/spreadsheets/d/${sheetId}/edit`
      });

    if (logError) throw logError;

    return new Response(
      JSON.stringify({ success: true, message: `Archived ${records.length} rows to ${monthName}`, month: monthName }),
      { headers: { "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("CRITICAL ERROR:", error);
    return new Response(
      JSON.stringify({ error: error.message || 'Unknown Error', stack: error.stack }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});