import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Verify authentication
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { type, input, context } = await req.json();

    if (!type || !input) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    let result;

    switch (type) {
      case 'meeting_summary':
        result = await generateMeetingSummary(base44, input, context);
        break;
      case 'task_classification':
        result = await classifyAndSuggestTasks(base44, input, context);
        break;
      case 'action_suggestions':
        result = await suggestActions(base44, input, context);
        break;
      default:
        return Response.json({ error: 'Invalid type' }, { status: 400 });
    }

    return Response.json(result);
  } catch (error) {
    console.error('AI Workflow Assistant error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});

async function generateMeetingSummary(base44, meetingNotes, context) {
  const prompt = `
אתה עוזר AI מקצועי. נתת לך הערות או תמלול של פגישה.
המטרה שלך היא ליצור סיכום מובנה וברור של הפגישה.

הערות הפגישה:
${meetingNotes}

${context?.client_name ? `הלקוח: ${context.client_name}` : ''}
${context?.project_name ? `הפרויקט: ${context.project_name}` : ''}

צור סיכום מקיף שכולל:
1. נושאים עיקריים שנדונו
2. החלטות שהתקבלו
3. משימות שהוקצו (אם יש)
4. פעולות המשך נדרשות

פורמט הפלט צריך להיות JSON עם השדות הבאים:
- summary: סיכום טקסטואלי מפורט
- actions: מערך של פעולות מומלצות, כל פעולה עם:
  - type: "task" / "meeting" / "contact"
  - label: תווית קצרה
  - title: כותרת
  - description: תיאור
  - priority: "נמוכה" / "בינונית" / "גבוהה"
  - action: "create_task" / "create_meeting_summary"
  - data: אובייקט עם הנתונים הנדרשים (לדוגמה: {title, description, priority, client_name, project_name})
`;

  const response = await base44.integrations.Core.InvokeLLM({
    prompt,
    response_json_schema: {
      type: 'object',
      properties: {
        summary: { type: 'string' },
        actions: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              type: { type: 'string' },
              label: { type: 'string' },
              title: { type: 'string' },
              description: { type: 'string' },
              priority: { type: 'string' },
              action: { type: 'string' },
              data: { type: 'object' }
            }
          }
        }
      }
    }
  });

  return response;
}

async function classifyAndSuggestTasks(base44, taskDescription, context) {
  const prompt = `
אתה עוזר AI מקצועי המתמחה בניהול משימות.
נתת לך תיאור של משימה או דרישה חדשה.
המטרה שלך היא לסווג את המשימה ולהציע אופן הטיפול בה.

תיאור המשימה:
${taskDescription}

${context?.client_name ? `הלקוח: ${context.client_name}` : ''}
${context?.project_name ? `הפרויקט: ${context.project_name}` : ''}

נתח את המשימה והחזר JSON עם:
- categories: מערך של קטגוריות רלוונטיות (פגישה, תכנון, היתרים, קניות, מעקב, אחר)
- priority: רמת עדיפות מוצעת (נמוכה, בינונית, גבוהה)
- actions: מערך של פעולות מומלצות
- estimated_hours: הערכת זמן לביצוע (מספר)
`;

  const response = await base44.integrations.Core.InvokeLLM({
    prompt,
    response_json_schema: {
      type: 'object',
      properties: {
        categories: {
          type: 'array',
          items: { type: 'string' }
        },
        priority: { type: 'string' },
        estimated_hours: { type: 'number' },
        actions: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              type: { type: 'string' },
              label: { type: 'string' },
              title: { type: 'string' },
              description: { type: 'string' },
              priority: { type: 'string' },
              action: { type: 'string' },
              data: { type: 'object' }
            }
          }
        }
      }
    }
  });

  return response;
}

async function suggestActions(base44, situationDescription, context) {
  const prompt = `
אתה עוזר AI מקצועי שמספק המלצות חכמות לפעולות.
נתת לך תיאור של מצב או אתגר שהמשתמש מתמודד איתו.

תיאור המצב:
${situationDescription}

${context?.client_name ? `הלקוח: ${context.client_name}` : ''}
${context?.project_name ? `הפרויקט: ${context.project_name}` : ''}

נתח את המצב והצע פעולות קונקרטיות שיעזרו למשתמש להתקדם.
החזר JSON עם:
- summary: ניתוח קצר של המצב
- actions: מערך של פעולות מומלצות (כל אחת עם type, label, title, description, priority, action, data)
`;

  const response = await base44.integrations.Core.InvokeLLM({
    prompt,
    response_json_schema: {
      type: 'object',
      properties: {
        summary: { type: 'string' },
        actions: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              type: { type: 'string' },
              label: { type: 'string' },
              title: { type: 'string' },
              description: { type: 'string' },
              priority: { type: 'string' },
              action: { type: 'string' },
              data: { type: 'object' }
            }
          }
        }
      }
    }
  });

  return response;
}