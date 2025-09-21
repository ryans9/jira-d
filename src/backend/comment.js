// No @forge/api import needed to just log
export async function onIssueCommented(event, context) {
    try {
        console.log('🔔 onIssueCommented triggered');
        // event payload typically contains issue, comment, user; log defensively
        // const issueKey = event?.issue?.key;
        // const commentId = event?.comment?.id;
        // const commentBody =
        //     event?.comment?.body?.content
        //         ? JSON.stringify(event.comment.body) // ADF format
        //         : event?.comment?.body; // plain string if present
        // const author =
        //     event?.comment?.author?.displayName ||
        //     event?.user?.displayName ||
        //     'Unknown';

        console.log('🗨️ Comment created event received', JSON.stringify(event));
        // console.log('• Cloud ID:', context?.cloudId);
        // console.log('• Issue Key:', issueKey);
        // console.log('• Comment ID:', commentId);
        // console.log('• Author:', author);
        console.log('• Comment body (raw):', JSON.stringify(context));

        // If you want to do more later (e.g., detect 🚀), add logic here.
        return { ok: true };
    } catch (e) {
        console.error('❌ Error in onIssueCommented:', e);
        return { ok: false, error: e.message };
    }
}
