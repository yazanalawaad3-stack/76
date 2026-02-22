const code = "750899";
const baseUrl = window.location.origin;
document.getElementById("refCode").value = code;
document.getElementById("refLink").value = `${baseUrl}/register.html?code=${code}`;

function shareLink(){
    navigator.share({
        title: "Invite Link",
        url: document.getElementById("refLink").value
    });
}
