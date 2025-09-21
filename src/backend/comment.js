// Enhanced comment processor for boost detection
export async function onIssueCommented(event, context) {
    try {
        console.log('🔔 onIssueCommented triggered - TESTING COMMENT TRIGGER');
        console.log('📋 Full event data:', JSON.stringify(event, null, 2));
        console.log('📋 Full context data:', JSON.stringify(context, null, 2));
        
        // Extract key information from the event
        const issueKey = event?.issue?.key;
        const commentId = event?.comment?.id;
        const commentBody = event?.comment?.body;
        const author = event?.comment?.author?.displayName || 'Unknown';
        const authorAccountId = event?.comment?.author?.accountId;
        const mentionedAccountIds = event?.mentionedAccountIds || [];
        
        console.log('🗨️ Comment created event received', {
            issueKey,
            commentId,
            author,
            mentionedUsers: mentionedAccountIds.length,
            eventType: event?.eventType
        });

        // Extract text content from ADF (Atlassian Document Format)
        const commentText = extractTextFromADF(commentBody);
        console.log('📝 Comment text:', commentText);
        
        // TEST: Always process any comment to see if trigger is working
        console.log('🧪 TESTING: Processing ANY comment to verify trigger is working');

        // Check if this comment contains boost triggers
        const boostTriggers = detectBoostTriggers(commentText);
        
        console.log('🔍 Boost analysis:', {
            hasRocket: boostTriggers.hasRocket,
            hasBoostTag: boostTriggers.hasBoostTag,
            hasMentions: boostTriggers.hasMentions,
            hasBoostWithMention: boostTriggers.hasBoostWithMention,
            mentions: boostTriggers.mentions,
            simpleMentions: boostTriggers.simpleMentions,
            mentionedAccountIds: mentionedAccountIds.length
        });
        
        if (boostTriggers.hasBoost) {
            console.log('🚀 Boost detected in comment!', {
                hasRocket: boostTriggers.hasRocket,
                hasBoostTag: boostTriggers.hasBoostTag,
                hasBoostWithMention: boostTriggers.hasBoostWithMention,
                mentionedUsers: mentionedAccountIds.length
            });

            // Process boost for mentioned users
            if (mentionedAccountIds.length > 0 || boostTriggers.hasMentions) {
                await processBoostFromComment({
                    issueKey,
                    commentId,
                    commentText,
                    author,
                    authorAccountId,
                    mentionedAccountIds,
                    boostTriggers,
                    context
                });
            } else {
                console.log('⚠️ No users mentioned in boost comment');
            }
        } else {
            console.log('ℹ️ No boost triggers found in comment');
        }

        return { ok: true };
    } catch (e) {
        console.error('❌ Error in onIssueCommented:', e);
        return { ok: false, error: e.message };
    }
}

// Extract plain text from ADF (Atlassian Document Format)
function extractTextFromADF(adfBody) {
    if (!adfBody || !adfBody.content) return '';
    
    let text = '';
    
    function traverseContent(content) {
        if (Array.isArray(content)) {
            content.forEach(item => {
                if (item.type === 'text') {
                    text += item.text || '';
                } else if (item.type === 'emoji') {
                    text += item.attrs?.text || '';
                } else if (item.type === 'mention') {
                    // Handle @ mentions in ADF format
                    const displayName = item.attrs?.text || '';
                    const accountId = item.attrs?.id || '';
                    text += `@[${displayName}](${accountId}) `;
                } else if (item.content) {
                    traverseContent(item.content);
                }
            });
        }
    }
    
    traverseContent(adfBody.content);
    return text.trim();
}

// Detect boost-related triggers in comment text
function detectBoostTriggers(text) {
    const lowerText = text.toLowerCase();
    
    // Check for rocket emoji (both actual emoji and :rocket: format)
    const hasRocket = text.includes('🚀') || lowerText.includes(':rocket:');
    
    // Check for boost-related keywords
    const hasBoostTag = lowerText.includes('#boost') || lowerText.includes('boost');
    
    // Check for @ mentions (Atlassian format)
    const mentionRegex = /@\[([^\]]+)\]\(([^)]+)\)/g;
    const mentions = [];
    let match;
    while ((match = mentionRegex.exec(text)) !== null) {
        mentions.push({
            displayName: match[1],
            accountId: match[2],
            fullMatch: match[0]
        });
    }
    
    // Also check for simple @username format (fallback)
    const simpleMentionRegex = /@(\w+)/g;
    const simpleMentions = [];
    let simpleMatch;
    while ((simpleMatch = simpleMentionRegex.exec(text)) !== null) {
        simpleMentions.push({
            username: simpleMatch[1],
            fullMatch: simpleMatch[0]
        });
    }
    
    return {
        hasRocket,
        hasBoostTag,
        hasBoost: hasRocket || hasBoostTag,
        mentions: mentions,
        simpleMentions: simpleMentions,
        hasMentions: mentions.length > 0 || simpleMentions.length > 0,
        // Special case: @username + 🚀 combination
        hasBoostWithMention: hasRocket && (mentions.length > 0 || simpleMentions.length > 0)
    };
}

// Process boost from comment
async function processBoostFromComment({ issueKey, commentId, commentText, author, authorAccountId, mentionedAccountIds, boostTriggers, context }) {
    try {
        console.log('🎯 Processing boost from comment...');
        
        // Prepare recipients list
        const recipients = [];
        
        // Add recipients from mentionedAccountIds (Jira's built-in mention detection)
        if (mentionedAccountIds && mentionedAccountIds.length > 0) {
            mentionedAccountIds.forEach(accountId => {
                recipients.push({
                    accountId: accountId,
                    displayName: `User ${accountId}`,
                    source: 'jira_mention'
                });
            });
        }
        
        // Add recipients from parsed mentions in comment text
        if (boostTriggers.mentions && boostTriggers.mentions.length > 0) {
            boostTriggers.mentions.forEach(mention => {
                recipients.push({
                    accountId: mention.accountId,
                    displayName: mention.displayName,
                    source: 'parsed_mention'
                });
            });
        }
        
        // Add recipients from simple @username mentions (fallback)
        if (boostTriggers.simpleMentions && boostTriggers.simpleMentions.length > 0) {
            boostTriggers.simpleMentions.forEach(mention => {
                recipients.push({
                    username: mention.username,
                    displayName: mention.username,
                    source: 'simple_mention'
                });
            });
        }
        
        // Remove duplicates based on accountId
        const uniqueRecipients = recipients.filter((recipient, index, self) => 
            index === self.findIndex(r => r.accountId === recipient.accountId)
        );
        
        if (uniqueRecipients.length === 0) {
            console.log('⚠️ No valid recipients found for boost');
            return;
        }
        
        console.log('👥 Recipients for boost:', uniqueRecipients);
        
        // Create boost data for each mentioned user
        // Filter to only include recipients with accountId (required by backend)
        const validRecipients = uniqueRecipients.filter(recipient => recipient.accountId);
        
        if (validRecipients.length === 0) {
            console.log('⚠️ No valid recipients with accountId found for boost');
            return;
        }
        
        // Send boost for each valid recipient individually (like frontend does)
        for (const recipient of validRecipients) {
            const boostData = {
                provider: 'forge',
                cloudId: context.cloudId || 'unknown-cloud',
                actor: authorAccountId || 'unknown-actor',
                integrationToken: 'default-token',
                recipients: [{
                    accountId: recipient.accountId,
                    displayName: recipient.displayName
                }],
                tempBoosts: 1,
                message: `🚀 Boost from ${author}: ${commentText}`,
                context: { triggerType: 'comment_boost' }
            };

            console.log('📤 Sending boost data to backend:', boostData);

            // Send to backend with timeout
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 10000);
            
            try {
                const response = await global.fetch('https://4816b3cc4249.ngrok-free.app/integrations/jira/boosts', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-Integration-Token': 'default-token'
                    },
                    body: JSON.stringify(boostData),
                    signal: controller.signal
                });
                
                clearTimeout(timeoutId);

                if (response.ok) {
                    const result = await response.json();
                    console.log('✅ Boost processed successfully:', {
                        recipient: recipient.displayName,
                        author: author,
                        issueKey: issueKey,
                        result: result
                    });
                } else {
                    const errorText = await response.text();
                    console.error('❌ Backend boost error:', {
                        status: response.status,
                        error: errorText,
                        recipient: recipient.displayName,
                        author: author
                    });
                }
            } catch (error) {
                clearTimeout(timeoutId);
                if (error.name === 'AbortError') {
                    console.error('⏰ Boost processing timed out:', {
                        recipient: recipient.displayName,
                        author: author,
                        issueKey: issueKey
                    });
                } else {
                    console.error('❌ Error processing boost:', {
                        error: error.message,
                        recipient: recipient.displayName,
                        author: author,
                        issueKey: issueKey
                    });
                }
            }
        }
        
    } catch (error) {
        console.error('❌ Error processing boost:', {
            error: error.message,
            author: author,
            issueKey: issueKey
        });
    }
}
