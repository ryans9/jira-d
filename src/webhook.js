// Using global fetch instead of importing

// Webhook handler for Jira events - similar to Slackbot
export const handler = async (event, context) => {
  console.log('🚀 REWARDIFY WEBHOOK TRIGGERED!');
  console.log('🚀 Full Event:', JSON.stringify(event, null, 2));
  console.log('🚀 Full Context:', JSON.stringify(context, null, 2));
  
  try {
    // Forge webhooks have a different structure
    const issue = event.issue;
    const user = event.user;
    const webhookEvent = event.webhookEvent || event.issue_event_type_name;
    
    console.log('📝 Parsed webhook data:', { 
      issue: issue?.key, 
      user: user?.displayName, 
      event: webhookEvent,
      hasComment: !!event.comment,
      commentBody: event.comment?.body
    });
    
    // Always try to process any webhook event
    if (issue && user) {
      console.log('🎯 Processing webhook for issue:', issue.key);
      
      // Check if this is a comment event
      if (event.comment) {
        console.log('💬 Comment detected, checking for boost triggers...');
        await handleCommentAdded(issue, user, event.comment);
      } else {
        console.log('📝 Issue event detected, checking for completion...');
        await handleIssueUpdated(issue, user);
      }
    } else {
      console.log('⚠️ Missing issue or user data in webhook');
    }
    
    return { success: true };
  } catch (error) {
    console.error('❌ Error processing webhook:', error);
    return { success: false, error: error.message };
  }
};

// Handle issue updates (status changes, etc.)
async function handleIssueUpdated(issue, user) {
  try {
    console.log('📝 Issue updated:', issue.key);
    
    // Check if this is a status transition that should trigger a boost
    const changelog = issue.changelog;
    if (changelog && changelog.items) {
      for (const item of changelog.items) {
        if (item.field === 'status') {
          // Check if transitioned to "Done" or "Resolved"
          if (item.toString && (item.toString.toLowerCase().includes('done') || 
                               item.toString.toLowerCase().includes('resolved'))) {
            console.log('✅ Issue completed, giving boost to:', user.displayName);
            await giveBoost(issue, user, 'issue_completed');
          }
        }
      }
    }
  } catch (error) {
    console.error('❌ Error handling issue update:', error);
  }
}

// Handle comment additions - this is like the Slackbot boost detection
async function handleCommentAdded(issue, user, comment) {
  try {
    console.log('💬 Comment added by:', user.displayName);
    
    // Check if comment contains boost trigger (like Slackbot)
    const commentBody = comment.body || '';
    const boostTriggers = ['🚀', ':rocket:', '#boost', 'boost', 'reward'];
    
    const hasBoostTrigger = boostTriggers.some(trigger => 
      commentBody.toLowerCase().includes(trigger.toLowerCase())
    );
    
    if (hasBoostTrigger) {
      console.log('🚀 Boost trigger detected in comment!');
      await giveBoost(issue, user, 'comment_boost', comment);
    }
  } catch (error) {
    console.error('❌ Error handling comment:', error);
  }
}

// Give boost to user - similar to Slackbot boost logic
async function giveBoost(issue, user, triggerType, comment = null) {
  try {
    console.log('🎯 Giving boost to:', user.displayName, 'for:', triggerType);
    
    // Prepare boost data for Rewardify backend
    const boostData = {
      provider: 'forge',
      cloudId: issue.fields.project.key,
      integrationToken: 'default-token', // Add integration token to body
      actor: {
        accountId: user.accountId,
        displayName: user.displayName,
        email: user.emailAddress
      },
      recipients: [{
        accountId: user.accountId,
        displayName: user.displayName,
        email: user.emailAddress
      }],
      tempBoosts: 1, // Give 1 boost like Slackbot
      message: generateBoostMessage(triggerType, issue, comment),
      context: {
        issueKey: issue.key,
        projectKey: issue.fields.project.key,
        issueId: issue.id,
        triggerType: triggerType,
        commentId: comment?.id,
        issueSummary: issue.fields.summary,
        issueUrl: `${issue.self.replace('/rest/api/2/issue/', '/browse/')}`
      }
    };
    
    // Send boost to Rewardify backend using global fetch
    const response = await global.fetch('https://9301f0ad7d4c.ngrok-free.app/integrations/jira/boosts', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Integration-Token': 'default-token'
      },
      body: JSON.stringify(boostData)
    });
    
    if (response.ok) {
      const result = await response.json();
      console.log('✅ Boost sent successfully:', result);
      
      // Add comment to Jira issue about the boost (like Slackbot notifications)
      await addBoostComment(issue, user, boostData.message);
    } else {
      console.error('❌ Failed to send boost:', response.status, await response.text());
    }
    
  } catch (error) {
    console.error('❌ Error giving boost:', error);
  }
}

// Generate boost message based on trigger type
function generateBoostMessage(triggerType, issue, comment) {
  switch (triggerType) {
    case 'issue_completed':
      return `🚀 Great job completing issue ${issue.key}! You earned a boost for finishing this task.`;
    case 'comment_boost':
      return `🚀 Thanks for the positive comment on ${issue.key}! You earned a boost for spreading positivity.`;
    default:
      return `🚀 You earned a boost for your contribution to ${issue.key}!`;
  }
}

// Add comment to Jira issue about the boost (like Slackbot notifications)
async function addBoostComment(issue, user, message) {
  try {
    const jiraApiUrl = `https://api.atlassian.com/ex/jira/${issue.fields.project.key}/rest/api/2/issue/${issue.id}/comment`;
    
    await global.fetch(jiraApiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        body: {
          type: 'doc',
          version: 1,
          content: [{
            type: 'paragraph',
            content: [{
              type: 'text',
              text: message
            }]
          }]
        }
      })
    });
    
    console.log('✅ Boost comment added to issue');
  } catch (error) {
    console.error('❌ Error adding boost comment:', error);
  }
}
