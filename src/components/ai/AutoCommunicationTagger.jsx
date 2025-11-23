import { base44 } from '@/api/base44Client';

export async function autoTagCommunication(communicationData) {
  try {
    const { subject, body, type, direction } = communicationData;
    const text = `${subject || ''} ${body || ''}`.toLowerCase();

    // Sentiment analysis
    const positive = ['תודה', 'מעולה', 'מצוין', 'נהדר', 'שמח', 'מרוצה', 'אהבתי', 'perfect', 'great', 'excellent'];
    const negative = ['בעיה', 'לא', 'מאוכזב', 'דחוף', 'טעות', 'כועס', 'לא מרוצה', 'problem', 'urgent', 'issue'];
    const urgent = ['דחוף', 'מיידי', 'חשוב', 'בהקדם', 'urgent', 'asap', 'important'];
    const meeting = ['פגישה', 'נפגש', 'לקבוע', 'meeting', 'schedule'];
    const payment = ['תשלום', 'חשבונית', 'כסף', 'העברה', 'payment', 'invoice', 'money'];
    const approval = ['אישור', 'אשר', 'לאשר', 'approval', 'approve'];

    const tags = [];
    let sentiment = 'neutral';
    let priority = 'normal';

    // Analyze sentiment
    const positiveCount = positive.filter(w => text.includes(w)).length;
    const negativeCount = negative.filter(w => text.includes(w)).length;
    
    if (negativeCount > positiveCount) {
      sentiment = 'negative';
      tags.push('שלילי');
    } else if (positiveCount > negativeCount) {
      sentiment = 'positive';
      tags.push('חיובי');
    } else {
      tags.push('ניטרלי');
    }

    // Check urgency
    if (urgent.some(w => text.includes(w))) {
      priority = 'urgent';
      tags.push('דחוף');
    }

    // Categorize by content
    if (meeting.some(w => text.includes(w))) {
      tags.push('פגישה');
    }
    if (payment.some(w => text.includes(w))) {
      tags.push('תשלום');
    }
    if (approval.some(w => text.includes(w))) {
      tags.push('אישור');
    }

    // Direction tags
    if (direction === 'in') {
      tags.push('נכנס');
    } else if (direction === 'out') {
      tags.push('יוצא');
    }

    // AI-powered deep analysis for complex cases
    if (text.length > 100 && tags.length < 3) {
      try {
        const prompt = `
נתח את ההודעה הבאה וחלץ 2-3 תגיות רלוונטיות:

${text.substring(0, 500)}

החזר רק רשימת תגיות מופרדות בפסיק, ללא הסברים.
דוגמאות לתגיות: בקשת שינוי, שאלה טכנית, תיאום, עדכון סטטוס, הצעת מחיר, משוב
`;

        const result = await base44.integrations.Core.InvokeLLM({
          prompt,
          add_context_from_internet: false
        });

        const aiTags = result
          .split(',')
          .map(t => t.trim())
          .filter(t => t && t.length < 30)
          .slice(0, 3);

        tags.push(...aiTags);
      } catch (e) {
        console.warn('AI tagging failed, using basic tags only');
      }
    }

    return {
      tags: [...new Set(tags)], // Remove duplicates
      sentiment,
      priority,
      auto_tagged: true
    };
  } catch (error) {
    console.error('Auto-tagging error:', error);
    return {
      tags: ['לא מתויג'],
      sentiment: 'neutral',
      priority: 'normal',
      auto_tagged: false
    };
  }
}

// Hook for automatic tagging on communication creation
export async function applyAutoTagging(communicationId) {
  try {
    const communications = await base44.entities.CommunicationMessage.filter({ id: communicationId });
    if (!communications || communications.length === 0) return;

    const comm = communications[0];
    const taggingData = await autoTagCommunication(comm);

    // Update the communication with tags and metadata
    await base44.entities.CommunicationMessage.update(communicationId, {
      tags: taggingData.tags,
      sentiment: taggingData.sentiment,
      priority: taggingData.priority
    });

    console.log('✅ Auto-tagging applied:', taggingData);
    return taggingData;
  } catch (error) {
    console.error('Failed to apply auto-tagging:', error);
  }
}