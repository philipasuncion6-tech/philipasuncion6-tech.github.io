package com.asuncion.vpn

import android.os.Bundle
import android.widget.Toast
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.animation.core.RepeatMode
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.tween
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp

private val DeepNavy = Color(0xFF080D20)
private val Cyan = Color(0xFF55E7FF)
private val Violet = Color(0xFF9B65FF)
private val Pink = Color(0xFFFF55C8)
private val Muted = Color(0xFFAAB5D0)

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent {
            MaterialTheme {
                AsuncionVpnScreen(
                    onConnectPressed = {
                        Toast.makeText(
                            this,
                            "A real VPN server is not configured yet.",
                            Toast.LENGTH_LONG
                        ).show()
                    }
                )
            }
        }
    }
}

@Composable
private fun AsuncionVpnScreen(onConnectPressed: () -> Unit) {
    val transition = rememberInfiniteTransition(label = "neon-lights")
    val pulse = transition.animateFloat(
        initialValue = 0.42f,
        targetValue = 1f,
        animationSpec = infiniteRepeatable(
            animation = tween(durationMillis = 1700),
            repeatMode = RepeatMode.Reverse
        ),
        label = "neon-pulse"
    )
    val drift = transition.animateFloat(
        initialValue = 0f,
        targetValue = 1f,
        animationSpec = infiniteRepeatable(
            animation = tween(durationMillis = 5200),
            repeatMode = RepeatMode.Reverse
        ),
        label = "neon-drift"
    )

    val neonBrush = Brush.linearGradient(
        colors = listOf(Cyan, Violet, Pink, Cyan),
        start = Offset(0f, 0f),
        end = Offset(900f * (0.5f + drift.value), 1200f)
    )

    Surface(modifier = Modifier.fillMaxSize(), color = DeepNavy) {
        Box(
            modifier = Modifier
                .fillMaxSize()
                .background(
                    Brush.linearGradient(
                        colors = listOf(
                            Color(0xFF101A3A),
                            DeepNavy,
                            Color(0xFF1B1034)
                        )
                    )
                )
        ) {
            Column(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(horizontal = 24.dp, vertical = 28.dp),
                horizontalAlignment = Alignment.CenterHorizontally,
                verticalArrangement = Arrangement.Center
            ) {
                Text("ASUNCION", color = Color.White, fontSize = 13.sp, letterSpacing = 5.sp)
                Text(
                    "VPN",
                    color = Color.White,
                    fontSize = 36.sp,
                    fontWeight = FontWeight.Black,
                    letterSpacing = 4.sp
                )
                Text(
                    "NEON EDITION",
                    color = Cyan.copy(alpha = pulse.value),
                    fontSize = 12.sp,
                    fontWeight = FontWeight.Bold,
                    letterSpacing = 3.sp
                )

                Spacer(Modifier.height(22.dp))

                Box(contentAlignment = Alignment.Center, modifier = Modifier.size(210.dp)) {
                    Canvas(modifier = Modifier.fillMaxSize()) {
                        val center = Offset(size.width / 2f, size.height / 2f)
                        val base = size.minDimension * 0.36f
                        drawCircle(
                            brush = neonBrush,
                            radius = base + 20.dp.toPx(),
                            center = center,
                            style = Stroke(width = 2.dp.toPx()),
                            alpha = 0.38f + pulse.value * 0.35f
                        )
                        drawCircle(
                            color = Violet.copy(alpha = 0.16f + pulse.value * 0.12f),
                            radius = base + 7.dp.toPx(),
                            center = center
                        )
                        drawCircle(
                            brush = neonBrush,
                            radius = base,
                            center = center,
                            style = Stroke(width = 5.dp.toPx()),
                            alpha = pulse.value
                        )
                    }
                    Box(
                        modifier = Modifier
                            .size(132.dp)
                            .clip(CircleShape)
                            .background(
                                Brush.linearGradient(
                                    listOf(
                                        Color(0xFF182B50),
                                        Color(0xFF251642),
                                        Color(0xFF102D45)
                                    )
                                )
                            ),
                        contentAlignment = Alignment.Center
                    ) {
                        Column(horizontalAlignment = Alignment.CenterHorizontally) {
                            Text("🛡️", fontSize = 42.sp)
                            Text(
                                "SAFE TUNNEL",
                                color = Color.White,
                                fontSize = 9.sp,
                                fontWeight = FontWeight.Bold,
                                letterSpacing = 1.sp
                            )
                        }
                    }
                }

                Spacer(Modifier.height(18.dp))

                Card(
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(24.dp),
                    colors = CardDefaults.cardColors(
                        containerColor = Color(0xFF151D38).copy(alpha = 0.96f)
                    )
                ) {
                    Column(
                        modifier = Modifier.padding(22.dp),
                        horizontalAlignment = Alignment.CenterHorizontally
                    ) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Spacer(
                                Modifier
                                    .size(10.dp)
                                    .background(Color(0xFFFFC857), CircleShape)
                            )
                            Spacer(Modifier.size(9.dp))
                            Text(
                                "NOT CONNECTED",
                                color = Color.White,
                                fontWeight = FontWeight.Bold,
                                fontSize = 17.sp,
                                letterSpacing = 1.sp
                            )
                        }
                        Spacer(Modifier.height(8.dp))
                        Text(
                            "Your secure server is not set up yet.",
                            color = Muted,
                            fontSize = 12.sp
                        )
                        Spacer(Modifier.height(20.dp))
                        Button(
                            onClick = onConnectPressed,
                            modifier = Modifier
                                .fillMaxWidth()
                                .height(54.dp),
                            enabled = false,
                            shape = RoundedCornerShape(18.dp),
                            colors = ButtonDefaults.buttonColors(
                                disabledContainerColor = Color(0xFF34405E),
                                disabledContentColor = Color(0xFFD5D9E8)
                            )
                        ) {
                            Text(
                                "CONNECT • COMING SOON",
                                fontWeight = FontWeight.Bold,
                                letterSpacing = 1.sp
                            )
                        }
                    }
                }

                Spacer(Modifier.height(22.dp))
                InfoRow("PROTOCOL", "WireGuard")
                Spacer(Modifier.height(10.dp))
                InfoRow("SERVER", "Not configured")
                Spacer(Modifier.height(20.dp))
                Text(
                    "NEON LIGHTS • REAL PRIVACY • WIREGUARD",
                    color = Muted.copy(alpha = 0.8f),
                    fontSize = 9.sp,
                    letterSpacing = 1.2.sp
                )
                Spacer(Modifier.height(8.dp))
                Text(
                    "Design preview only. Protection starts only after a real VPN tunnel is configured and connected.",
                    color = Muted,
                    fontSize = 10.sp,
                    lineHeight = 15.sp
                )
            }
        }
    }
}

@Composable
private fun InfoRow(label: String, value: String) {
    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.SpaceBetween
    ) {
        Text(label, color = Muted, fontSize = 12.sp, letterSpacing = 1.sp)
        Text(value, color = Color.White, fontSize = 12.sp, fontWeight = FontWeight.SemiBold)
    }
}
